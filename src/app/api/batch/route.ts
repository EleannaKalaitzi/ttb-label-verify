import { startBatch, type BatchInput } from '@/lib/batch/job';
import { parseApplicationsCsv } from '@/lib/batch/csv-parse';
import type { ApplicationData } from '@/lib/verify/verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILES = 300;
const MAX_BYTES = 8 * 1024 * 1024;
const MEDIA: Record<string, BatchInput['mediaType']> = {
  'image/png': 'image/png',
  'image/jpeg': 'image/jpeg',
  'image/jpg': 'image/jpeg',
  'image/webp': 'image/webp',
  'image/gif': 'image/gif',
};

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: 'Expected a form upload.' }, { status: 400 });
  }

  const files = form.getAll('images').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return Response.json({ error: 'Please choose one or more label images.' }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return Response.json({ error: `Too many files (${files.length}). The limit is ${MAX_FILES} per batch.` }, { status: 413 });
  }

  // Optional applications CSV: each label is verified against its matching row
  // (full 7-field comparison) instead of the label-intrinsic checks only.
  let apps = new Map<string, ApplicationData>();
  const csv = form.get('applications');
  if (csv instanceof File && csv.size > 0) {
    try {
      apps = parseApplicationsCsv(await csv.text());
    } catch {
      /* malformed CSV → fall back to label-intrinsic checks */
    }
  }

  const inputs: BatchInput[] = [];
  const skipped: string[] = [];
  for (const file of files) {
    const mediaType = MEDIA[file.type];
    if (!mediaType || file.size > MAX_BYTES) {
      skipped.push(file.name || '(unnamed)');
      continue;
    }
    inputs.push({
      filename: file.name || `label-${inputs.length + 1}`,
      imageBase64: Buffer.from(await file.arrayBuffer()).toString('base64'),
      mediaType,
      declared: apps.get(file.name) ?? null,
    });
  }

  if (inputs.length === 0) {
    return Response.json({ error: 'None of the files were usable images (PNG/JPEG/WebP/GIF, ≤8 MB).' }, { status: 415 });
  }

  const matched = inputs.filter((i) => i.declared).length;
  const job = startBatch(inputs);
  return Response.json({ jobId: job.id, total: job.total, skipped, matched });
}
