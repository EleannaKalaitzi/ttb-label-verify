import { readFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { startBatch, type BatchInput } from '@/lib/batch/job';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MEDIA: Record<string, BatchInput['mediaType']> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/**
 * Starts a batch from the real sample label photos (public/samples/) so a
 * reviewer can see the exception-first results immediately, without uploading.
 * The run is real: each label goes through the same extract-then-decide pipeline
 * as an upload (a real model read in the live deployment; the authored read in
 * no-key mock mode).
 */
export async function POST() {
  try {
    const dir = join(process.cwd(), 'public', 'samples');
    const names = (await readdir(dir)).filter((n) => MEDIA[extname(n).toLowerCase()]).sort();

    const inputs: BatchInput[] = [];
    for (const name of names) {
      const buf = await readFile(join(dir, name));
      inputs.push({ filename: name, imageBase64: buf.toString('base64'), mediaType: MEDIA[extname(name).toLowerCase()] });
    }

    if (inputs.length === 0) {
      return Response.json({ error: 'No sample labels are available.' }, { status: 404 });
    }

    const job = startBatch(inputs);
    return Response.json({ jobId: job.id, total: job.total });
  } catch {
    return Response.json({ error: 'Could not load the sample labels.' }, { status: 500 });
  }
}
