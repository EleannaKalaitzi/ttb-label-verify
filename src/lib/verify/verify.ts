import type { Extraction } from '../extraction/schema';
import type { FieldVerdict, Verdict } from '../verdict/types';
import { rollup } from '../verdict/types';
import { compareBrand } from '../compare/brand';
import { compareClassType } from '../compare/classtype';
import { compareAbv, crossCheckProof } from '../compare/abv';
import { compareNetContents } from '../compare/net-contents';
import { compareBottler } from '../compare/bottler';
import { compareCountry } from '../compare/country';
import { checkWarning } from '../rules/warning';
import { checkStandardOfIdentity } from '../rules/standards-of-identity';

/**
 * The declared values from a compliance application — what the label is
 * asserted to say. In this prototype these come from the reviewer (typed in or
 * a simulated COLA payload); COLA integration is out of scope.
 */
export interface ApplicationData {
  brand_name: string | null;
  class_type: string | null;
  /** Declared ABV; accepts a number or a string like "45%". */
  alcohol_content: string | number | null;
  net_contents: string | null;
  producer_bottler: string | null;
  /** Declared country of origin; null/empty for a domestic product. */
  country_of_origin: string | null;
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

  verdicts.push(compareNetContents(declared.net_contents, extraction.net_contents));
  verdicts.push(compareBottler(declared.producer_bottler, extraction.producer_bottler));
  verdicts.push(compareCountry(declared.country_of_origin, extraction.country_of_origin));

  // Against the regulations.
  verdicts.push(...checkWarning(extraction.government_warning));
  verdicts.push(
    checkStandardOfIdentity(extraction.class_type, extraction.alcohol_content.abv_percent),
  );

  return { overall: rollup(verdicts), verdicts, extraction };
}

/**
 * Label-only verification for batch runs, where there is no per-image
 * application data to compare against. Runs the checks a label can be judged on
 * by itself — the regulatory ones (warning, standard of identity) plus the
 * internal proof/ABV consistency cross-check. This surfaces labels that are
 * non-compliant on their own terms across a high-volume submission.
 */
export function verifyLabelOnly(extraction: Extraction | null): VerificationResult {
  if (extraction == null) {
    return {
      overall: 'FLAG',
      verdicts: [
        {
          check: 'extraction',
          label: 'Label reading',
          verdict: 'FLAG',
          reason: 'The label image could not be read automatically. A reviewer should check it by hand.',
        },
      ],
      extraction: null,
    };
  }

  const verdicts: FieldVerdict[] = [];
  const proofCheck = crossCheckProof(
    extraction.alcohol_content.abv_percent,
    extraction.alcohol_content.proof,
  );
  if (proofCheck) verdicts.push(proofCheck);
  verdicts.push(...checkWarning(extraction.government_warning));
  verdicts.push(
    checkStandardOfIdentity(extraction.class_type, extraction.alcohol_content.abv_percent),
  );

  return { overall: rollup(verdicts), verdicts, extraction };
}
