import { getJob } from '@/lib/batch/job';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Poll batch progress + results. Next 16: `params` is async. */
export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = getJob(jobId);
  if (!job) {
    return Response.json({ error: 'Batch not found (it may have expired).' }, { status: 404 });
  }
  return Response.json(job);
}
