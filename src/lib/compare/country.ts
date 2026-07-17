import type { FieldVerdict } from '../verdict/types';
import { cautiousTextMatch } from './text-match';

/**
 * Country of origin vs the application. Country of origin is required for
 * imports, but a domestic product legitimately shows none — so "neither the
 * application nor the label states a country" is a PASS (domestic), not a gap.
 * A mismatch between what's declared and what's shown routes to a human.
 */
export function compareCountry(
  declared: string | null | undefined,
  extracted: string | null | undefined,
): FieldVerdict {
  const base = { check: 'country_of_origin', label: 'Country of origin', declared, extracted } as const;
  const declaredEmpty = declared == null || declared.trim() === '';
  const extractedEmpty = extracted == null || extracted.trim() === '';

  if (declaredEmpty && extractedEmpty) {
    return { ...base, verdict: 'PASS', reason: 'No country of origin declared or shown — treated as a domestic product.' };
  }
  if (!declaredEmpty && extractedEmpty) {
    return {
      ...base,
      verdict: 'FLAG',
      reason: `The application declares country of origin “${declared}”, but none is legible on the label. It is required for imports — a reviewer should confirm.`,
    };
  }
  if (declaredEmpty && !extractedEmpty) {
    return {
      ...base,
      verdict: 'FLAG',
      reason: `The label shows country of origin “${extracted}”, but the application declares none. A reviewer should reconcile.`,
    };
  }
  // Strip common lead-ins so "Product of Scotland" matches "Scotland".
  const strip = (s: string) =>
    s.replace(/^\s*(product of|produced in|made in|imported from|distilled in)\s+/i, '').trim();
  return cautiousTextMatch(strip(declared!), strip(extracted!), {
    check: 'country_of_origin',
    label: 'Country of origin',
    fieldName: 'Country of origin',
  });
}
