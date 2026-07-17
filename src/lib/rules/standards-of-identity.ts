import { normalize } from '../compare/normalize';
import type { FieldVerdict } from '../verdict/types';

/**
 * Standards of identity — class/type validity (27 CFR Part 5, Subpart I).
 *
 * Class and type designations are legally defined, not free text. A label can
 * be internally non-compliant even when it perfectly matches its application:
 * "Kentucky Straight Bourbon Whiskey" at 38% ABV is non-compliant on its face,
 * because that designation carries a minimum bottling strength of 40% ABV.
 *
 * This is deliberately a small static TABLE, not a rule engine. Each entry
 * carries the one checkable-from-label-text-alone rule that matters here —
 * minimum bottling ABV — and its governing citation. Anything not in the table
 * returns "not evaluated": an honest gap, stated in the README, never an
 * inferred verdict.
 *
 * Section numbers and the 40% ABV (80 proof) minimum bottling strength for each
 * class were VERIFIED against the current CFR text (Cornell LII / eCFR) on
 * SOI_VERIFIED_AGAINST. Re-confirmation against the live eCFR is the job of the
 * designed (deliberately unbuilt) staleness check — never a request-path call.
 */

export const SOI_VERIFIED_AGAINST = '2026-07-16';
const SUBPART_I = 'https://www.ecfr.gov/current/title-27/part-5/subpart-I';

/** Canonical eCFR link for a section string like "27 CFR § 5.143". */
function ecfrSectionUrl(section: string): string {
  const num = section.match(/5\.\d+|16\.\d+/)?.[0];
  return num ? `https://www.ecfr.gov/current/title-27/section-${num}` : SUBPART_I;
}

export interface StandardOfIdentity {
  /** Human-readable designation. */
  name: string;
  /** Normalized keywords that must ALL appear in the label's class/type text
   *  for this entry to apply. Longer/more-specific entries are matched first. */
  keywords: string[];
  /** Minimum bottling strength, percent ABV. */
  minAbv: number;
  /** Governing citation for this designation's minimum strength. */
  citationSection: string;
}

/**
 * Ordered most-specific first so "straight bourbon whiskey" wins over "whiskey".
 * All distilled-spirits classes below share the 40% ABV minimum bottling
 * strength; the table is structured to carry per-class values should they ever
 * differ.
 */
export const STANDARDS_OF_IDENTITY: StandardOfIdentity[] = [
  // Bourbon, rye, Scotch, Irish, etc. are all TYPES OF WHISKY under § 5.143,
  // which sets the 40% ABV minimum bottling strength for the whole class.
  { name: 'Straight Bourbon Whiskey', keywords: ['straight', 'bourbon', 'whiskey'], minAbv: 40, citationSection: '27 CFR § 5.143' },
  { name: 'Straight Rye Whiskey', keywords: ['straight', 'rye', 'whiskey'], minAbv: 40, citationSection: '27 CFR § 5.143' },
  { name: 'Bourbon Whiskey', keywords: ['bourbon', 'whiskey'], minAbv: 40, citationSection: '27 CFR § 5.143' },
  { name: 'Rye Whiskey', keywords: ['rye', 'whiskey'], minAbv: 40, citationSection: '27 CFR § 5.143' },
  { name: 'Scotch Whisky', keywords: ['scotch', 'whisky'], minAbv: 40, citationSection: '27 CFR § 5.143' },
  { name: 'Irish Whiskey', keywords: ['irish', 'whiskey'], minAbv: 40, citationSection: '27 CFR § 5.143' },
  { name: 'Whisky', keywords: ['whisky'], minAbv: 40, citationSection: '27 CFR § 5.143' },
  { name: 'Whiskey', keywords: ['whiskey'], minAbv: 40, citationSection: '27 CFR § 5.143' },
  // Vodka is defined as a neutral spirit under § 5.142, which sets the 40% min.
  { name: 'Vodka', keywords: ['vodka'], minAbv: 40, citationSection: '27 CFR § 5.142' },
  { name: 'Gin', keywords: ['gin'], minAbv: 40, citationSection: '27 CFR § 5.144' },
  { name: 'Brandy', keywords: ['brandy'], minAbv: 40, citationSection: '27 CFR § 5.145' },
  { name: 'Rum', keywords: ['rum'], minAbv: 40, citationSection: '27 CFR § 5.147' },
  // Tequila and mezcal are agave spirits under § 5.148.
  { name: 'Tequila', keywords: ['tequila'], minAbv: 40, citationSection: '27 CFR § 5.148' },
  { name: 'Mezcal', keywords: ['mezcal'], minAbv: 40, citationSection: '27 CFR § 5.148' },
];

export const SUBPART_I_AUTHORITY = SUBPART_I;

/** Find the most-specific standard-of-identity entry whose keywords all appear
 *  in the (normalized) class/type text. Returns null when the designation isn't
 *  in our table — an honest "not evaluated", never a guess. */
export function matchStandard(classType: string): StandardOfIdentity | null {
  const text = ` ${normalize(classType)} `;
  for (const soi of STANDARDS_OF_IDENTITY) {
    if (soi.keywords.every((k) => text.includes(` ${k} `) || text.includes(` ${k}`) || text.includes(`${k} `))) {
      return soi;
    }
  }
  return null;
}

/**
 * Validity check: is this class/type designation lawful at the label's stated
 * ABV? A designation carrying a minimum bottling strength that the ABV falls
 * below is non-compliant on its face — even if it matches the application
 * perfectly. Designations not in our table return "not evaluated" (a FLAG that
 * states the gap honestly), never a guessed verdict.
 */
export function checkStandardOfIdentity(
  classType: string | null | undefined,
  abv: number | null | undefined,
): FieldVerdict {
  const base = {
    check: 'standards_of_identity',
    label: 'Standard of identity (class/type validity)',
    extracted: classType ?? null,
  } as const;

  if (classType == null || classType.trim() === '') {
    return {
      ...base,
      verdict: 'FLAG',
      reason: 'Class/type could not be read, so its standard of identity cannot be evaluated.',
      citation: {
        section: '27 CFR Part 5, Subpart I',
        authority: SUBPART_I,
        plainLanguage: 'Class and type designations are legally defined standards of identity.',
      },
    };
  }

  const soi = matchStandard(classType);
  if (soi == null) {
    // Beverage-aware: point wine/malt designations at their own regulations
    // rather than a spirits-framed message. The spirits table is authoritative;
    // other beverage types are honestly "not evaluated".
    const t = classType.toLowerCase();
    const domain = /\b(wine|champagne|sparkling|port|sherry|vermouth|sauvignon|cabernet|chardonnay|merlot|pinot|riesling|zinfandel|ros[eé]|prosecco|moscato|sangria)\b/.test(t)
      ? { section: '27 CFR Part 4', url: 'https://www.ecfr.gov/current/title-27/part-4', kind: 'Wine' }
      : /\b(beer|ale|lager|stout|porter|ipa|pilsner|malt liquor|malt beverage)\b/.test(t)
        ? { section: '27 CFR Part 7', url: 'https://www.ecfr.gov/current/title-27/part-7', kind: 'Malt-beverage' }
        : { section: '27 CFR Part 5, Subpart I', url: SUBPART_I, kind: 'Distilled-spirits' };
    return {
      ...base,
      verdict: 'FLAG',
      reason:
        `“${classType}” is outside this tool's standards-of-identity rule set (which covers distilled ` +
        `spirits). ${domain.kind} standards of identity (${domain.section}) are not evaluated here — a ` +
        `reviewer should assess it directly.`,
      citation: {
        section: domain.section,
        authority: domain.url,
        plainLanguage: 'Class and type designations are legally defined standards of identity, by beverage type.',
      },
    };
  }

  const citation = {
    section: soi.citationSection,
    authority: ecfrSectionUrl(soi.citationSection),
    plainLanguage: `“${soi.name}” must be bottled at no less than ${soi.minAbv}% alcohol by volume (${soi.minAbv * 2} proof).`,
  };

  if (abv == null) {
    return {
      ...base,
      verdict: 'FLAG',
      reason:
        `“${soi.name}” carries a minimum bottling strength of ${soi.minAbv}% ABV, but the label's ABV ` +
        `could not be read. A reviewer should confirm it meets the minimum.`,
      citation,
    };
  }

  if (abv < soi.minAbv) {
    return {
      ...base,
      verdict: 'FAIL',
      declared: soi.minAbv,
      reason:
        `“${soi.name}” at ${abv}% ABV is below the minimum bottling strength of ${soi.minAbv}% required ` +
        `for this designation. It is non-compliant even if it matches its application.`,
      citation,
    };
  }

  return {
    ...base,
    verdict: 'PASS',
    declared: soi.minAbv,
    reason: `“${soi.name}” at ${abv}% ABV meets the ${soi.minAbv}% minimum bottling strength.`,
    citation,
  };
}
