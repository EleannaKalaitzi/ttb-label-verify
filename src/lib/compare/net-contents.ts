import type { FieldVerdict } from '../verdict/types';

/**
 * Net-contents comparison against the application. Parsed to millilitres so
 * "750 mL", "750ml", and "0.75 L" all compare equal; a genuine volume
 * difference (750 mL vs 700 mL) FAILs. Unreadable or un-parseable units FLAG
 * rather than guess.
 */

/** Tolerance for float/rounding equality, in mL. */
const TOL_ML = 0.5;

/** Parse a net-contents string to millilitres. Handles mL, cL, L. Returns null
 *  if no recognizable quantity+unit is present. */
export function parseNetContentsMl(value: string | null | undefined): number | null {
  if (value == null) return null;
  const s = String(value).toLowerCase().replace(/,/g, '');
  const m = s.match(/(\d+(?:\.\d+)?)\s*(ml|milliliters?|millilitres?|cl|centilitres?|l|liters?|litres?)\b/);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2];
  if (unit.startsWith('ml') || unit.startsWith('milli')) return n;
  if (unit.startsWith('cl') || unit.startsWith('centi')) return n * 10;
  return n * 1000; // l / liter / litre
}

export function compareNetContents(
  declared: string | null | undefined,
  extracted: string | null | undefined,
): FieldVerdict {
  const base = { check: 'net_contents', label: 'Net contents', declared, extracted } as const;

  if (extracted == null || extracted.trim() === '') {
    return { ...base, verdict: 'FLAG', reason: 'Net contents could not be read from the label. A reviewer should confirm it.' };
  }
  if (declared == null || declared.trim() === '') {
    return { ...base, verdict: 'FLAG', reason: 'No net contents were declared on the application to compare against.' };
  }

  const d = parseNetContentsMl(declared);
  const e = parseNetContentsMl(extracted);
  if (d == null || e == null) {
    return { ...base, verdict: 'FLAG', reason: `Could not interpret the net-contents units (“${extracted}” vs “${declared}”). A reviewer should confirm.` };
  }

  if (Math.abs(d - e) <= TOL_ML) {
    return { ...base, verdict: 'PASS', reason: `Net contents match the application (${extracted} vs ${declared}).` };
  }
  return { ...base, verdict: 'FAIL', reason: `Net contents do not match the application (label ${extracted} vs declared ${declared}).` };
}
