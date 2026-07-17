import type { FieldVerdict } from '../verdict/types';
import { cosmeticallyEqual, similarity } from './normalize';

/**
 * Brand-name comparison, "Cautious" policy:
 *   - cosmetically identical            -> PASS
 *   - unreadable / missing              -> FLAG (route to human)
 *   - differs, but plausibly same brand -> FLAG (route to human)
 *   - clearly a different brand         -> FAIL
 *
 * PASS requires cosmetic equality — we never auto-PASS a near-miss. The
 * similarity gate below ONLY separates "probably the same, let a human decide"
 * (FLAG) from "clearly different" (FAIL). This favours FLAG over FAIL, matching
 * the cost asymmetry: an unnecessary review is cheap; a wrong auto-verdict is
 * not.
 */

/**
 * Below this normalized similarity, two brands are treated as clearly different
 * (FAIL). At or above it, a residual difference is FLAGged for a human.
 *
 * PROVISIONAL: set from judgment now; to be tuned against the labelled corpus
 * in the measurement pass (favouring sensitivity — prefer FLAG over a wrong
 * FAIL). See PLAN.md Session 6.
 */
export const BRAND_FAIL_BELOW = 0.5;

export function compareBrand(
  declared: string | null | undefined,
  extracted: string | null | undefined,
): FieldVerdict {
  const base = { check: 'brand_name', label: 'Brand name', declared, extracted } as const;

  if (extracted == null || extracted.trim() === '') {
    return {
      ...base,
      verdict: 'FLAG',
      reason: 'Brand name could not be read from the label. A reviewer should confirm it by eye.',
    };
  }
  if (declared == null || declared.trim() === '') {
    return {
      ...base,
      verdict: 'FLAG',
      reason: 'No brand name was declared on the application to compare against.',
    };
  }

  if (cosmeticallyEqual(declared, extracted)) {
    return {
      ...base,
      verdict: 'PASS',
      reason: 'Brand name matches the application (ignoring case, punctuation, and spacing).',
    };
  }

  const sim = similarity(declared, extracted);
  if (sim >= BRAND_FAIL_BELOW) {
    return {
      ...base,
      verdict: 'FLAG',
      reason:
        `Brand name differs from the application beyond cosmetic formatting ` +
        `(“${extracted}” vs “${declared}”). It may still be the same brand — a reviewer should decide.`,
    };
  }

  return {
    ...base,
    verdict: 'FAIL',
    reason: `Brand name does not match the application (“${extracted}” vs “${declared}”).`,
  };
}
