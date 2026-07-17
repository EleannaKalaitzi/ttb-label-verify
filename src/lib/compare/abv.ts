import type { FieldVerdict } from '../verdict/types';

/**
 * Alcohol-content checks.
 *
 * Two independent things happen here:
 *  1. compareAbv  — does the label's ABV match the application's declared ABV?
 *  2. crossCheckProof — is the label internally consistent (proof ≈ 2 × ABV)?
 *     This is a finding about the label on its own terms, regardless of the
 *     application.
 *
 * ABV is compared numerically, so "45%", "45.0%", and "45% Alc./Vol." are
 * equal. A difference beyond a tiny float epsilon is a substantive mismatch.
 */

/** Numeric tolerance for float equality (45 === 45.0). Not a real-world
 *  ABV tolerance — a printed 45 vs 40 is a genuine mismatch and must FAIL. */
const EPSILON = 0.05;

/** How far proof may drift from 2 × ABV before we FLAG an inconsistency.
 *  0.5 proof allows for rounding on the label without masking a real error. */
const PROOF_TOLERANCE = 0.5;

/** Parse a declared ABV that may arrive as a number or a string like
 *  "45", "45%", or "45% Alc./Vol.". Returns null if no number is present. */
export function parseAbv(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const match = value.match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

export function compareAbv(
  declared: string | number | null | undefined,
  extractedAbv: number | null | undefined,
): FieldVerdict {
  const declaredNum = parseAbv(declared);
  const base = {
    check: 'alcohol_content',
    label: 'Alcohol content',
    declared: declaredNum,
    extracted: extractedAbv ?? null,
  } as const;

  if (extractedAbv == null) {
    return {
      ...base,
      verdict: 'FLAG',
      reason: 'Alcohol content could not be read from the label. A reviewer should confirm it.',
    };
  }
  if (declaredNum == null) {
    return {
      ...base,
      verdict: 'FLAG',
      reason: 'No alcohol content was declared on the application to compare against.',
    };
  }

  if (Math.abs(declaredNum - extractedAbv) <= EPSILON) {
    return {
      ...base,
      verdict: 'PASS',
      reason: `Alcohol content matches the application (${extractedAbv}% vs ${declaredNum}%).`,
    };
  }

  return {
    ...base,
    verdict: 'FAIL',
    reason: `Alcohol content does not match the application (label ${extractedAbv}% vs declared ${declaredNum}%).`,
  };
}

/**
 * Internal-consistency check on the label alone: US proof is defined as twice
 * the ABV. If the label prints both and they disagree, that is a finding no
 * matter what the application says. It is a FLAG, not a FAIL — the discrepancy
 * warrants a human look but isn't by itself a regulatory violation we measure.
 * Returns null when the label doesn't print both figures (nothing to check).
 */
export function crossCheckProof(
  abv: number | null | undefined,
  proof: number | null | undefined,
): FieldVerdict | null {
  if (abv == null || proof == null) return null;

  const expectedProof = abv * 2;
  if (Math.abs(proof - expectedProof) <= PROOF_TOLERANCE) {
    return {
      check: 'alcohol_content.proof_consistency',
      label: 'Proof / ABV consistency',
      verdict: 'PASS',
      declared: expectedProof,
      extracted: proof,
      reason: `Proof (${proof}) is consistent with the stated ABV of ${abv}% (expected ~${expectedProof}).`,
    };
  }

  return {
    check: 'alcohol_content.proof_consistency',
    label: 'Proof / ABV consistency',
    verdict: 'FLAG',
    declared: expectedProof,
    extracted: proof,
    reason:
      `The label is internally inconsistent: proof ${proof} implies ${proof / 2}% ABV, ` +
      `but the label states ${abv}%. Proof should be twice the ABV (expected ~${expectedProof}).`,
  };
}
