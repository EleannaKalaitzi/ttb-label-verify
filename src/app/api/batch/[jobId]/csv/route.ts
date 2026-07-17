import { getJob } from '@/lib/batch/job';
import { batchToCsv } from '@/lib/batch/csv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Download the batch result as CSV. Next 16: `params` is async. */
export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = getJob(jobId);
  if (!job) {
    return new Response('Batch not found (it may have expired).', { status: 404 });
  }
  return new Response(batchToCsv(job), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ttb-batch-${jobId.slice(0, 8)}.csv"`,
    },
  });
}
