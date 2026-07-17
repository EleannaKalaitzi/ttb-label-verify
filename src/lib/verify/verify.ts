import type { Extraction } from '../extraction/schema';
import type { FieldVerdict, Verdict } from '../verdict/types';
import { rollup } from '../verdict/types';
import { compareBrand } from '../compare/brand';
import { compareClassType } from '../compare/classtype';
import { compareAbv, crossCheckProof } from '../compare/abv';
import { checkWarning } from '../rules/warning';
import { checkStandardOfIdentity } from '../rules/standards-of-identity';

/**
 * The declared values from a compliance application — what the label is
 * asserted to say. In this prototype these come from the reviewer (typed in or
 * a simulated COLA payload); COLA integration is out of scope.
 * Net contents / bottler / country of origin are deliberately out of scope.
 */
export interface ApplicationData {
  brand_name: string | null;
  class_type: string | null;
  /** Declared ABV; accepts a number or a string like "45%". */
  alcohol_content: string | number | null;
}

export interface VerificationResult {
  overall: Verdict;
  verdicts: FieldVerdict[];
  /** The extraction the verdicts were computed from (null if extraction failed
   *  entirely — then `overall` is NEEDS_REVIEW-style, surfaced via verdicts). */
  extraction: Extraction | null;
}

/**
 * The whole compliance evaluation, in one deterministic, model-free function.
 * Given what the model read off the label and what the application declared,
 * produce every field verdict and the overall roll-up.
 *
 * If extraction failed (null), we don't guess: we return a single FLAG telling
 * the reviewer the label couldn't be read and must be checked by hand.
 */
export function verify(
  extraction: Extraction | null,
  declared: ApplicationData,
): VerificationResult {
  if (extraction == null) {
    const needsReview: FieldVerdict = {
      check: 'extraction',
      label: 'Label reading',
      verdict: 'FLAG',
      reason:
        'The label image could not be read automatically (unreadable, timed out, or malformed). ' +
        'A reviewer should check this label by hand.',
    };
    return { overall: 'FLAG', verdicts: [needsReview], extraction: null };
  }

  const verdicts: FieldVerdict[] = [];

  // Against the application.
  verdicts.push(compareBrand(declared.brand_name, extraction.brand_name));
  verdicts.push(compareClassType(declared.class_type, extraction.class_type));
  verdicts.push(compareAbv(declared.alcohol_content, extraction.alcohol_content.abv_percent));

  // Internal consistency: proof vs ABV (only when both are printed).
  const proofCheck = crossCheckProof(
    extraction.alcohol_content.abv_percent,
    extraction.alcohol_content.proof,
  );
  if (proofCheck) verdicts.push(proofCheck);

  // Against the regulations.
  verdicts.push(...checkWarning(extraction.government_warning));
  verdicts.push(
    checkStandardOfIdentity(extraction.class_type, extraction.alcohol_content.abv_percent),
  );

  return { overall: rollup(verdicts), verdicts, extraction };
}
