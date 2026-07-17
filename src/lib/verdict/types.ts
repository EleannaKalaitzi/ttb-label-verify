/**
 * The verdict vocabulary. Three states, and FLAG is load-bearing:
 * a missed non-compliant label costs far more than an unnecessary review, so
 * when a check is uncertain it FLAGs for a human rather than guessing.
 *
 *  PASS — matches / compliant
 *  FLAG — cosmetic difference, low confidence, unreadable field, or genuine
 *         ambiguity. Routes to a human. Never a silent pass or fail.
 *  FAIL — substantive mismatch or a regulatory violation.
 */
export type Verdict = 'PASS' | 'FLAG' | 'FAIL';

/** The regulatory (or application) authority behind a verdict. Every non-PASS
 *  verdict carries one — an unexplained verdict can only be obeyed or ignored,
 *  and the prior tool was ignored. */
export interface Citation {
  /** e.g. "27 CFR § 16.22" */
  section: string;
  /** Link to the governing text. */
  authority: string;
  /** The rule in plain language, shown to the reviewer next to the verdict. */
  plainLanguage: string;
}

/** The result of a single check. */
export interface FieldVerdict {
  /** Machine key for the check, e.g. "brand_name", "warning.remainder_not_bold". */
  check: string;
  /** Human label for the check, e.g. "Brand name". */
  label: string;
  verdict: Verdict;
  /** Plain-language explanation of THIS result (why it passed/flagged/failed). */
  reason: string;
  /** What the application declared (if this is a comparison check). */
  declared?: string | number | null;
  /** What was read off the label. */
  extracted?: string | number | null;
  /** The authority; present on every non-PASS verdict, optional on PASS. */
  citation?: Citation;
}

/** Roll up many field verdicts into one overall verdict for the label.
 *  any FAIL -> FAIL; else any FLAG -> FLAG; else PASS. */
export function rollup(verdicts: FieldVerdict[]): Verdict {
  if (verdicts.some((v) => v.verdict === 'FAIL')) return 'FAIL';
  if (verdicts.some((v) => v.verdict === 'FLAG')) return 'FLAG';
  return 'PASS';
}
