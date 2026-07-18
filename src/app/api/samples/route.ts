import { FIXTURES } from '@/lib/fixtures/specs';

export const runtime = 'nodejs';

/**
 * A curated set of sample labels for the single-label demo: each carries the
 * image filename (served by /api/sample-image) plus the "declared application"
 * data, so the UI can load one — image + all six fields — with a single click.
 * Real labels are added here the same way once their declared data is known.
 */
const PICK = [
  '01-clean-pass',
  '05-bourbon-38',
  '02-warning-title-case',
  '09-wine-compliant',
  '11-malt-compliant',
];

export function GET() {
  const byId = new Map(FIXTURES.map((f) => [f.id, f]));
  const samples = PICK.map((id) => byId.get(id))
    .filter((f): f is NonNullable<typeof f> => Boolean(f))
    .map((f) => ({ id: f.id, name: f.title, filename: `${f.id}.png`, declared: f.declared }));
  return Response.json({ samples });
}
