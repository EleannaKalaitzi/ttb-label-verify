import type { BatchJob } from './job';

/**
 * CSV export of a batch run — the durable record. Nothing is stored
 * server-side, so results are ephemeral by design; the reviewer keeps the file,
 * the tool keeps nothing. One row per label, with the failing checks, their
 * plain-language reasons, and their citations.
 */
export function batchToCsv(job: BatchJob): string {
  const header = ['#', 'filename', 'overall', 'failing_checks', 'reasons', 'citations'];
  const rows = [header];

  for (const item of job.items) {
    const attention = item.verdicts.filter((v) => v.verdict !== 'PASS');
    rows.push([
      String(item.index + 1),
      item.filename,
      item.overall ?? '',
      attention.map((v) => `${v.verdict}: ${v.label}`).join('; '),
      attention.map((v) => v.reason).join(' | '),
      attention
        .map((v) => v.citation?.section)
        .filter(Boolean)
        .join('; '),
    ]);
  }

  return rows.map((row) => row.map(cell).join(',')).join('\r\n');
}

/** RFC-4180 quoting: wrap in quotes and double any embedded quotes when the
 *  value contains a comma, quote, or newline. */
function cell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
