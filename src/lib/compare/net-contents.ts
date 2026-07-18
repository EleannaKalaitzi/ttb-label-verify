import type { FieldVerdict } from '../verdict/types';

/**
 * Net-contents comparison against the application. Parsed to millilitres so
 * "750 mL", "750ml", and "0.75 L" all compare equal — and so metric and U.S.
 * customary measures cross-compare: "12 fl oz" ≈ "355 mL". Metric (mL, cL, L)
 * covers spirits and wine; U.S. fluid measures (fl oz, pint, quart, gallon)
 * cover malt beverages, which are routinely labelled in fluid ounces. A genuine
 * volume difference (750 mL vs 700 mL) FAILs; unreadable or un-parseable units
 * FLAG rather than guess.
 */

/** Tolerance for float/rounding equality, in mL. */
const TOL_ML = 0.5;

/** U.S. customary liquid measures in millilitres. */
const ML_PER_FL_OZ = 29.5735;
const ML_PER_PINT = ML_PER_FL_OZ * 16; // 473.18
const ML_PER_QUART = ML_PER_FL_OZ * 32; // 946.35
const ML_PER_GALLON = ML_PER_FL_OZ * 128; // 3785.41

/** Parse a net-contents string to millilitres. Handles metric (mL, cL, L) and
 *  U.S. fluid measures (fl oz, pint, quart, gallon). Returns null if no
 *  recognizable quantity+unit is present. Periods in unit abbreviations
 *  ("fl. oz.") are tolerated; decimal points in the quantity are preserved. */
export function parseNetContentsMl(value: string | null | undefined): number | null {
  if (value == null) return null;
  const s = String(value).toLowerCase().replace(/,/g, '');
  // fl oz / fluid ounce(s) must precede bare oz; pint/quart/gallon after metric.
  const m = s.match(
    /(\d+(?:\.\d+)?)\s*(fl\.?\s*oz\.?|fluid\s*ounces?|oz\.?|ounces?|ml|milliliters?|millilitres?|cl|centilitres?|centiliters?|l|liters?|litres?|pints?|pt\.?|quarts?|qt\.?|gallons?|gal\.?)(?![a-z])/,
  );
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2];
  if (unit.startsWith('ml') || unit.startsWith('milli')) return n;
  if (unit.startsWith('cl') || unit.startsWith('centi')) return n * 10;
  if (unit.startsWith('fl') || unit.startsWith('fluid') || unit.startsWith('oz') || unit.startsWith('ounce'))
    return n * ML_PER_FL_OZ;
  if (unit.startsWith('pt') || unit.startsWith('pint')) return n * ML_PER_PINT;
  if (unit.startsWith('qt') || unit.startsWith('quart')) return n * ML_PER_QUART;
  if (unit.startsWith('gal')) return n * ML_PER_GALLON;
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
