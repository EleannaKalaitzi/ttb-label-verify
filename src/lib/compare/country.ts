import type { FieldVerdict } from '../verdict/types';
import { cautiousTextMatch } from './text-match';

/**
 * Country of origin vs the application. Country of origin is required for
 * IMPORTED products; a domestic product legitimately shows none. The tool
 * cannot read a bottle's passport — so it never *assumes* domestic. When
 * neither the application nor the label states a country, it treats the product
 * as domestic ONLY when there is positive evidence (a U.S. producer address);
 * otherwise it FLAGs for a human, because a missing country on an import is a
 * real violation the tool must not wave through.
 */
export function compareCountry(
  declared: string | null | undefined,
  extracted: string | null | undefined,
  producerBottler?: string | null,
): FieldVerdict {
  const base = { check: 'country_of_origin', label: 'Country of origin', declared, extracted } as const;
  const declaredEmpty = declared == null || declared.trim() === '';
  const extractedEmpty = extracted == null || extracted.trim() === '';

  if (declaredEmpty && extractedEmpty) {
    if (looksDomestic(producerBottler)) {
      return {
        ...base,
        verdict: 'PASS',
        reason:
          'No country of origin is stated, and the producer address is in the U.S. — consistent ' +
          'with a domestic product (country of origin is required only for imports).',
      };
    }
    return {
      ...base,
      verdict: 'FLAG',
      reason:
        'No country of origin is stated and the product’s origin cannot be confirmed. If it is ' +
        'imported, a country of origin is required — a reviewer should confirm whether this is a ' +
        'domestic or imported product.',
    };
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

const US_STATES =
  'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC'.split(
    ' ',
  );

/** Positive evidence that the producer is in the U.S. (so no country statement
 *  is required): an explicit U.S. mention, or an address ending in a U.S. state
 *  abbreviation. Absence of evidence is NOT treated as domestic. */
function looksDomestic(producerBottler: string | null | undefined): boolean {
  if (!producerBottler) return false;
  const s = producerBottler.trim();
  if (/\b(u\.?s\.?a\.?|united states|america)\b/i.test(s)) return true;
  const tail = s.match(/,\s*([A-Za-z]{2})\.?\s*$/); // ", KY" / ", ky."
  return tail ? US_STATES.includes(tail[1].toUpperCase()) : false;
}
