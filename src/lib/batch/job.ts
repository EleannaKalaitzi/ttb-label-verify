import { randomUUID } from 'node:crypto';
import { getSharedExtractionProvider } from '../extraction/provider';
import type { ExtractionInput } from '../extraction/provider';
import { verifyLabelOnly } from '../verify/verify';
import type { FieldVerdict, Verdict } from '../verdict/types';

/**
 * Server-side batch processing. A reviewer starts a run of up to a few hundred
 * labels and can close the tab — the work continues on the (persistent Railway)
 * container. Job state lives in memory; nothing is persisted to disk (no PII).
 *
 * A bounded worker pool caps concurrency so 300 labels don't fire 300 parallel
 * requests (which would draw 429s); the SDK's own exponential backoff handles
 * any rate limiting within that. Each item is isolated: one label that fails to
 * process returns a FLAG, never an error that sinks the whole run.
 */

export interface BatchInput {
  filename: string;
  imageBase64: string;
  mediaType: ExtractionInput['mediaType'];
}

export interface BatchItem {
  index: number;
  filename: string;
  status: 'pending' | 'done';
  overall: Verdict | null;
  verdicts: FieldVerdict[];
  latencyMs: number | null;
  cached: boolean;
  error: string | null;
}

export interface BatchJob {
  id: string;
  createdAt: number;
  total: number;
  completed: number;
  status: 'running' | 'done';
  items: BatchItem[];
}

const CONCURRENCY = 6;
const JOB_TTL_MS = 60 * 60 * 1000; // evict finished jobs after ~1h
const jobs = new Map<string, BatchJob>();

export function getJob(id: string): BatchJob | undefined {
  return jobs.get(id);
}

export function startBatch(inputs: BatchInput[]): BatchJob {
  evictOld();
  const id = randomUUID();
  const items: BatchItem[] = inputs.map((inp, i) => ({
    index: i,
    filename: inp.filename,
    status: 'pending',
    overall: null,
    verdicts: [],
    latencyMs: null,
    cached: false,
    error: null,
  }));
  const job: BatchJob = { id, createdAt: Date.now(), total: inputs.length, completed: 0, status: 'running', items };
  jobs.set(id, job);
  // Fire-and-forget: processing continues server-side after the response returns.
  void run(job, inputs);
  return job;
}

async function run(job: BatchJob, inputs: BatchInput[]): Promise<void> {
  const provider = await getSharedExtractionProvider();
  let next = 0;

  async function worker(): Promise<void> {
    while (next < inputs.length) {
      const i = next++;
      const item = job.items[i];
      try {
        const res = await provider.extract({ imageBase64: inputs[i].imageBase64, mediaType: inputs[i].mediaType });
        const result = verifyLabelOnly(res.data);
        item.overall = result.overall;
        item.verdicts = result.verdicts;
        item.latencyMs = Math.round(res.latencyMs);
        item.cached = res.cached ?? false;
        item.error = res.error ?? null;
      } catch (e) {
        // Per-item isolation — a 300-label run returns 299 results and 1 flag.
        item.overall = 'FLAG';
        item.error = e instanceof Error ? e.message : 'unknown_error';
        item.verdicts = [
          { check: 'extraction', label: 'Label reading', verdict: 'FLAG', reason: 'This label could not be processed. A reviewer should check it by hand.' },
        ];
      } finally {
        item.status = 'done';
        job.completed++;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, inputs.length) }, worker));
  job.status = 'done';
}

function evictOld(): void {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of jobs) {
    if (job.status === 'done' && job.createdAt < cutoff) jobs.delete(id);
  }
}
