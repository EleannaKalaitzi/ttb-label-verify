import { normalize } from '../compare/normalize';
import type { FieldVerdict } from '../verdict/types';
import { detectBeverageType, checkAgainstTable } from './beverage-standards';
import { WINE_STANDARDS, wineEnvelope } from './wine';
import { evaluateMalt } from './malt';

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

export const SOI_VERIFIED_AGAINST = '2026-07-17';
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
  { name: 'Agave Spirits', keywords: ['agave'], minAbv: 40, citationSection: '27 CFR § 5.148' },
  // Neutral spirits and grain spirits — § 5.142 (vodka handled above).
  { name: 'Neutral Spirits', keywords: ['neutral', 'spirits'], minAbv: 40, citationSection: '27 CFR § 5.142' },
  { name: 'Grain Spirits', keywords: ['grain', 'spirits'], minAbv: 40, citationSection: '27 CFR § 5.142' },
  // Named brandies are all the class "brandy" (§ 5.145), 40% minimum bottling strength.
  { name: 'Cognac', keywords: ['cognac'], minAbv: 40, citationSection: '27 CFR § 5.145' },
  { name: 'Armagnac', keywords: ['armagnac'], minAbv: 40, citationSection: '27 CFR § 5.145' },
  { name: 'Calvados', keywords: ['calvados'], minAbv: 40, citationSection: '27 CFR § 5.145' },
  { name: 'Pisco', keywords: ['pisco'], minAbv: 40, citationSection: '27 CFR § 5.145' },
  { name: 'Grappa', keywords: ['grappa'], minAbv: 40, citationSection: '27 CFR § 5.145' },
  // Applejack / blended applejack — § 5.146.
  { name: 'Applejack', keywords: ['applejack'], minAbv: 40, citationSection: '27 CFR § 5.146' },
  // Cachaça is a type of rum — § 5.147.
  { name: 'Cachaça', keywords: ['cachaca'], minAbv: 40, citationSection: '27 CFR § 5.147' },
];

export const SUBPART_I_AUTHORITY = SUBPART_I;

/** Find the most-specific standard-of-identity entry whose keywords all appear
 *  in the (normalized) class/type text. Returns null when the designation isn't
 *  in our table — an honest "not evaluated", never a guess. */
export function matchStandard(classType: string): StandardOfIdentity | null {
  // Whole-word match: the text is space-padded on both ends, so ` k ` matches k
  // at any position (first/last included) WITHOUT matching it as a substring of a
  // larger word — e.g. "gin" must not match "Ginjo" (sake).
  const text = ` ${normalize(classType)} `;
  for (const soi of STANDARDS_OF_IDENTITY) {
    if (soi.keywords.every((k) => text.includes(` ${k} `))) {
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

  // Spirits classes that DISPLACE the base-spirit table (checked first, because
  // their designations contain base-spirit words but carry different or no
  // rules): flavored spirits (§ 5.151, 30%), cordials & liqueurs (§ 5.150), and
  // imitations (§ 5.152). This is what stops "Cherry Flavored Bourbon Whisky"
  // (30% min) and "Sloe Gin" (a liqueur, no min) from being falsely failed
  // against whisky's/gin's 40%.
  const special = checkSpiritsSpecialClass(classType, abv);
  if (special) return special;

  const soi = matchStandard(classType);
  if (soi == null) {
    // Dispatch to the beverage-specific rule table (offline data-as-code). Empty
    // stubs today → checkAgainstTable returns null → honest "not evaluated"; once
    // a table is populated from its pinned CFR source, real checks run here with
    // no other wiring.
    const type = detectBeverageType(classType);
    if (type === 'wine') {
      // Specific type (table/dessert/sherry/…) first; otherwise the Part 4 scope
      // envelope, so cider, perry, sake, mead and bare varietals are evaluated.
      return checkAgainstTable(classType, abv, WINE_STANDARDS) ?? wineEnvelope(classType, abv);
    }
    if (type === 'malt') {
      // Malt has NO numeric standard of identity (no min/max bottling strength,
      // unlike spirits' 40% or wine's 7–24%). Its standard of identity is the
      // class/type DESIGNATION itself (§ 7.63) — evaluated by recognition.
      return evaluateMalt(classType);
    }
    if (type === 'spirits') {
      // A spirit meeting no standard of identity is a "distilled spirits
      // specialty product" (§ 5.156): designated by statement of composition,
      // with no minimum bottling strength. We can't verify the statement of
      // composition from the label, so we FLAG for a reviewer rather than fail.
      return spiritsSpecialty(classType);
    }
    // Beverage type undetermined — do NOT assert a spirits standard for it.
    return notEvaluatedUnknown(classType);
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

/** Base-spirit words that make a "flavored X" a § 5.151 flavored spirit (as
 *  opposed to e.g. a "flavored malt beverage", which is a malt product). */
const SPIRIT_BASE = /\b(whisky|whiskey|bourbon|rye|scotch|vodka|gin|rum|tequila|mezcal|agave|brandy|cognac|neutral spirits?)\b/;

/**
 * Distilled-spirits classes that DISPLACE the base-spirit table because their
 * designations contain base-spirit words but carry different (or no) rules:
 *   • Imitations (§ 5.152): recognized designation, no ABV floor.
 *   • Flavored spirits (§ 5.151): 30% minimum — "Cherry Flavored Bourbon Whisky"
 *     is NOT held to whisky's 40%.
 *   • Cordials & liqueurs (§ 5.150): the class has NO minimum bottling strength;
 *     named spirit-based types do — rock-and-X 24%, X-liqueur 30%. "Sloe gin" is
 *     a liqueur (no floor), NOT gin at 40%.
 * Returns a verdict, or null to fall through to the base-spirit table.
 */
function checkSpiritsSpecialClass(classType: string, abv: number | null | undefined): FieldVerdict | null {
  const t = ` ${normalize(classType)} `;

  // Imitations — § 5.152 — recognized designation, no bottling-strength standard.
  if (/ imitation /.test(t)) {
    return {
      check: 'standards_of_identity',
      label: 'Standard of identity (class/type validity)',
      extracted: classType,
      verdict: 'PASS',
      reason: `“${classType}” is an imitation designation (§ 5.152), which carries no minimum bottling strength. The required word “imitation” is present.`,
      citation: { section: '27 CFR § 5.152', authority: ecfrSectionUrl('§ 5.152'), plainLanguage: 'A product simulating a class or type of distilled spirits must bear the word "imitation" as part of its designation.' },
    };
  }

  // Flavored spirits — § 5.151 — 30% min — only when the base is a spirit, so a
  // "flavored malt beverage" is left to the malt path.
  if (/ flavored /.test(t) && SPIRIT_BASE.test(t)) {
    return abvVerdict(classType, abv, 30, 'Flavored spirits', '27 CFR § 5.151',
      'Flavored spirits (a base spirit plus added natural flavors) must be bottled at not less than 30% alcohol by volume (60 proof).');
  }

  // Cordials & liqueurs — § 5.150.
  const rockAndX = / rock and (rye|bourbon|brandy|rum) /.test(t);
  const isLiqueur =
    rockAndX ||
    / (liqueur|cordial|amaretto|kummel|ouzo|anisette|sambuca|curacao|goldwasser|schnapps) /.test(t) ||
    / triple sec /.test(t) ||
    / creme de /.test(t) ||
    / sloe gin /.test(t);

  if (isLiqueur) {
    if (rockAndX) {
      return abvVerdict(classType, abv, 24, 'Rock and rye/bourbon/brandy/rum', '27 CFR § 5.150(b)(3)',
        'Rock and rye, rock and bourbon, rock and brandy, and rock and rum must be bottled at not less than 24% alcohol by volume.');
    }
    if (/ (liqueur|cordial) /.test(t) && / (rye|bourbon|rum|gin|brandy) /.test(t)) {
      return abvVerdict(classType, abv, 30, 'Spirit-based liqueur', '27 CFR § 5.150(b)',
        'A rye, bourbon, rum, gin, or brandy liqueur (or cordial) must be bottled at not less than 30% alcohol by volume.');
    }
    // Any other cordial/liqueur: § 5.150 sets NO minimum bottling strength.
    return {
      check: 'standards_of_identity',
      label: 'Standard of identity (class/type validity)',
      extracted: classType,
      verdict: 'PASS',
      reason: `“${classType}” is a recognized cordial/liqueur. 27 CFR § 5.150 sets no minimum bottling strength for the cordials-and-liqueurs class, so there is no ABV threshold to check — the designation is valid.`,
      citation: { section: '27 CFR § 5.150', authority: ecfrSectionUrl('§ 5.150'), plainLanguage: 'Cordials and liqueurs are flavored spirits containing at least 2.5% sugar; the class carries no minimum bottling strength.' },
    };
  }

  return null;
}

/** Build a minimum-bottling-strength verdict for a spirits designation. */
function abvVerdict(
  extracted: string,
  abv: number | null | undefined,
  minAbv: number,
  name: string,
  section: string,
  plainLanguage: string,
): FieldVerdict {
  const base = {
    check: 'standards_of_identity',
    label: 'Standard of identity (class/type validity)',
    extracted,
    citation: { section, authority: ecfrSectionUrl(section), plainLanguage },
  } as const;
  if (abv == null) {
    return { ...base, verdict: 'FLAG', reason: `“${name}” carries a minimum bottling strength of ${minAbv}% ABV, but the label's ABV could not be read. A reviewer should confirm it meets the minimum.` };
  }
  if (abv < minAbv) {
    return { ...base, verdict: 'FAIL', declared: minAbv, reason: `“${name}” at ${abv}% ABV is below the ${minAbv}% minimum bottling strength for this designation.` };
  }
  return { ...base, verdict: 'PASS', declared: minAbv, reason: `“${name}” at ${abv}% ABV meets the ${minAbv}% minimum bottling strength.` };
}

/** A spirit meeting no standard of identity is a "distilled spirits specialty
 *  product" (§ 5.156) — designated by statement of composition, no bottling-
 *  strength standard. We can't verify the statement of composition from the
 *  label, so we FLAG for review rather than assert a pass or fail. */
function spiritsSpecialty(classType: string): FieldVerdict {
  return {
    check: 'standards_of_identity',
    label: 'Standard of identity (class/type validity)',
    extracted: classType,
    verdict: 'FLAG',
    reason:
      `“${classType}” matches no specific distilled-spirits standard of identity, so it is a distilled ` +
      `spirits specialty product (§ 5.156) — designated by a statement of composition, with no minimum ` +
      `bottling strength. A reviewer should confirm it bears a truthful and adequate statement of composition.`,
    citation: {
      section: '27 CFR § 5.156',
      authority: ecfrSectionUrl('§ 5.156'),
      plainLanguage: 'Distilled spirits that meet no other standard of identity are specialty products, designated by a distinctive/fanciful name plus a statement of composition.',
    },
  };
}

/** Honest verdict when the beverage type itself can't be determined from the
 *  class/type — we do NOT default to a spirits standard, we say we couldn't tell. */
function notEvaluatedUnknown(classType: string): FieldVerdict {
  return {
    check: 'standards_of_identity',
    label: 'Standard of identity (class/type validity)',
    extracted: classType,
    verdict: 'FLAG',
    reason:
      `The beverage type of “${classType}” could not be determined from its class/type, so no standard ` +
      `of identity was applied. A reviewer should identify the product (wine, spirit, or malt beverage) ` +
      `and confirm its designation.`,
    citation: {
      section: '27 CFR Parts 4, 5, 7',
      authority: 'https://www.ecfr.gov/current/title-27',
      plainLanguage: 'Standards of identity are defined by beverage type — wine (Part 4), distilled spirits (Part 5), and malt beverages (Part 7).',
    },
  };
}

