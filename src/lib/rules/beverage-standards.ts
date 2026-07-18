import type { FieldVerdict } from '../verdict/types';
import { normalize } from '../compare/normalize';

/**
 * Generic, offline standards-of-identity engine shared by every beverage type.
 * Each beverage (spirits, wine, malt) supplies its own rule TABLE as
 * data-as-code (see standards-of-identity.ts / wine.ts / malt.ts), verified
 * against a pinned CFR source in ./sources and dated. This file is the engine
 * that consults a table; the tables are the data.
 *
 * To add rules for a beverage: pin its CFR text in ./sources, fill its table
 * with BeverageStandard entries, and cite. The dispatcher in
 * standards-of-identity.ts picks them up — no other wiring.
 */

export type BeverageType = 'spirits' | 'wine' | 'malt' | 'unknown';

export interface BeverageStandard {
  /** Human-readable designation, e.g. "Table wine". */
  name: string;
  /** Normalized keywords that must ALL appear in the class/type to match.
   *  Order the table most-specific first. */
  keywords: string[];
  /** Minimum ABV %, if the designation carries one. */
  minAbv?: number;
  /** Maximum ABV %, if the designation carries one (e.g. wine class ranges). */
  maxAbv?: number;
  /** Governing citation, e.g. "27 CFR § 4.21". */
  citationSection: string;
  /** eCFR link for the citation. */
  authority: string;
  /** Plain-language statement of the rule, shown next to the verdict. */
  plainLanguage: string;
}

/** Classify a class/type designation into a beverage family, from label text.
 *  Wine is tested first, so a wine term wins over an incidental spirits word
 *  (e.g. "added brandy"). The wine vocabulary spans Part 4's classes: grape
 *  wine, the fortified/dessert types (§ 4.21(a)(6)), aperitif wine (§ 4.21(g)),
 *  and the NON-GRAPE wines — cider, perry, sake, mead, agricultural/fruit wine
 *  (§ 4.21(e),(f)) — plus common varietal and semi-generic type names. */
export function detectBeverageType(classType: string): BeverageType {
  const t = ` ${normalize(classType)} `;
  if (
    /\b(wine|champagne|sparkling|prosecco|cava|port|sherry|vermouth|aperitif|angelica|muscat|muscatel|madeira|marsala|retsina|sake|mead|cider|perry|moscato|sangria|rose)\b/.test(t) ||
    /\b(sauvignon|cabernet|chardonnay|merlot|pinot|riesling|zinfandel|syrah|shiraz|malbec|grenache|sangiovese|tempranillo|gewurztraminer|viognier|gamay|barbera|nebbiolo|semillon|chenin|mourvedre|carignan|verdot)\b/.test(t) ||
    /\b(burgundy|chablis|chianti|claret|sauterne|sauternes|moselle|hock|tokay|beaujolais|rioja|bordeaux)\b/.test(t)
  )
    return 'wine';
  if (/\b(beer|ale|lager|stout|porter|ipa|pilsner|pils|bock|saison|kolsch|gose|dunkel|marzen|oktoberfest|hefeweizen|weissbier|malt liquor|malt beverage)\b/.test(t))
    return 'malt';
  if (/\b(whisky|whiskey|bourbon|rye|scotch|vodka|gin|rum|tequila|mezcal|brandy|cognac|armagnac|liqueur|cordial|schnapps|aquavit|absinthe|spirit|spirits|agave)\b/.test(t))
    return 'spirits';
  return 'unknown';
}

/** Most-specific table entry whose keywords all appear in the class/type text. */
export function matchStandard(classType: string, table: BeverageStandard[]): BeverageStandard | null {
  const text = ` ${normalize(classType)} `;
  for (const std of table) {
    // Whole-word match only (space-padded), so e.g. "port" ≠ "Porter".
    if (std.keywords.every((k) => text.includes(` ${k} `))) {
      return std;
    }
  }
  return null;
}

/**
 * Evaluate a class/type against a beverage's rule table. Returns a verdict when
 * a rule matches, or **null** when the designation isn't in the table (the
 * caller then reports an honest "not evaluated"). Checks minimum and/or maximum
 * ABV — an empty table always returns null, so an un-populated beverage is
 * never falsely judged.
 */
export function checkAgainstTable(
  classType: string | null | undefined,
  abv: number | null | undefined,
  table: BeverageStandard[],
): FieldVerdict | null {
  if (classType == null || classType.trim() === '') return null;
  const std = matchStandard(classType, table);
  if (std == null) return null;

  const citation = { section: std.citationSection, authority: std.authority, plainLanguage: std.plainLanguage };
  const base = {
    check: 'standards_of_identity',
    label: 'Standard of identity (class/type validity)',
    extracted: classType,
    citation,
  } as const;

  if (abv == null) {
    return { ...base, verdict: 'FLAG', reason: `“${std.name}” carries a defined alcohol range, but the label's ABV could not be read. A reviewer should confirm.` };
  }
  if (std.minAbv != null && abv < std.minAbv) {
    return { ...base, verdict: 'FAIL', declared: std.minAbv, reason: `“${std.name}” at ${abv}% ABV is below the ${std.minAbv}% minimum for this designation.` };
  }
  if (std.maxAbv != null && abv > std.maxAbv) {
    return { ...base, verdict: 'FAIL', declared: std.maxAbv, reason: `“${std.name}” at ${abv}% ABV is above the ${std.maxAbv}% maximum for this designation.` };
  }
  const range =
    std.minAbv != null && std.maxAbv != null ? `${std.minAbv}–${std.maxAbv}%`
    : std.minAbv != null ? `≥ ${std.minAbv}%`
    : `≤ ${std.maxAbv}%`;
  return { ...base, verdict: 'PASS', reason: `“${std.name}” at ${abv}% ABV is within the ${range} required for this designation.` };
}
