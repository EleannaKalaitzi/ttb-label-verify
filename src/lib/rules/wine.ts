import type { BeverageStandard } from './beverage-standards';
import type { FieldVerdict } from '../verdict/types';

/**
 * Wine standards of identity — 27 CFR Part 4.
 *
 * Encoded from the pinned source ./sources/part-04-wine.md (eCFR, up to date as
 * of 2026-07-15). Only the rules that are CHECKABLE FROM LABEL TEXT ALONE are
 * here — principally the alcohol-by-volume ranges each class/type carries in
 * § 4.21, plus the Part 4 scope envelope (§ 4.6). Compositional standards
 * (volatile acidity, cellar treatment, grape percentages) are out of scope: not
 * determinable from a label, so never guessed.
 *
 * Table is ordered MOST-SPECIFIC FIRST, so "light sherry" wins over "sherry".
 * A wine whose class/type matches no specific entry falls back to wineEnvelope()
 * below — the § 4.6 / § 4.7 scope check — so a wine is always evaluated, never
 * silently skipped.
 *
 * Boundary note: § 4.21 uses strict language ("in excess of 14 percent", "not
 * less than 17 percent"). These checks treat the boundary value itself as
 * compliant (e.g. exactly 17.0% passes as "sherry"), which is the right leniency
 * for an uncalibrated label read — the failure that matters is a designation
 * clearly outside its range (a "table wine" at 16%), not a hairline rounding at
 * the exact cutoff.
 */

export const WINE_VERIFIED_AGAINST: string | null = '2026-07-17';
export const WINE_SOURCE = 'src/lib/rules/sources/part-04-wine.md';

const S_421 = 'https://www.ecfr.gov/current/title-27/part-4/section-4.21';
const S_46 = 'https://www.ecfr.gov/current/title-27/part-4/section-4.6';

export const WINE_STANDARDS: BeverageStandard[] = [
  // ---- Dessert-wine sub-types with a floor derived from added spirits (§ 4.21(a)(6)) ----
  // "Light" variants: over 14% but below the base type's floor.
  { name: 'Light sherry', keywords: ['light', 'sherry'], minAbv: 14, maxAbv: 17, citationSection: '27 CFR § 4.21(a)(6)', authority: S_421, plainLanguage: 'Light sherry is a dessert wine over 14% but under 17% alcohol by volume.' },
  { name: 'Light angelica', keywords: ['light', 'angelica'], minAbv: 14, maxAbv: 18, citationSection: '27 CFR § 4.21(a)(6)', authority: S_421, plainLanguage: 'Light angelica is a dessert wine over 14% but under 18% alcohol by volume.' },
  { name: 'Light madeira', keywords: ['light', 'madeira'], minAbv: 14, maxAbv: 18, citationSection: '27 CFR § 4.21(a)(6)', authority: S_421, plainLanguage: 'Light madeira is a dessert wine over 14% but under 18% alcohol by volume.' },
  { name: 'Light muscatel', keywords: ['light', 'muscatel'], minAbv: 14, maxAbv: 18, citationSection: '27 CFR § 4.21(a)(6)', authority: S_421, plainLanguage: 'Light muscatel is a dessert wine over 14% but under 18% alcohol by volume.' },
  { name: 'Light port', keywords: ['light', 'port'], minAbv: 14, maxAbv: 18, citationSection: '27 CFR § 4.21(a)(6)', authority: S_421, plainLanguage: 'Light port is a dessert wine over 14% but under 18% alcohol by volume.' },
  // Base dessert types: minimum strength from added grape brandy/alcohol.
  { name: 'Sherry', keywords: ['sherry'], minAbv: 17, maxAbv: 24, citationSection: '27 CFR § 4.21(a)(6)', authority: S_421, plainLanguage: 'Sherry is a dessert wine of not less than 17% alcohol by volume (and, as a wine, not more than 24%).' },
  { name: 'Angelica', keywords: ['angelica'], minAbv: 18, maxAbv: 24, citationSection: '27 CFR § 4.21(a)(6)', authority: S_421, plainLanguage: 'Angelica is a dessert wine of not less than 18% alcohol by volume (and, as a wine, not more than 24%).' },
  { name: 'Madeira', keywords: ['madeira'], minAbv: 18, maxAbv: 24, citationSection: '27 CFR § 4.21(a)(6)', authority: S_421, plainLanguage: 'Madeira is a dessert wine of not less than 18% alcohol by volume (and, as a wine, not more than 24%).' },
  { name: 'Muscatel', keywords: ['muscatel'], minAbv: 18, maxAbv: 24, citationSection: '27 CFR § 4.21(a)(6)', authority: S_421, plainLanguage: 'Muscatel is a dessert wine of not less than 18% alcohol by volume (and, as a wine, not more than 24%).' },
  { name: 'Port', keywords: ['port'], minAbv: 18, maxAbv: 24, citationSection: '27 CFR § 4.21(a)(6)', authority: S_421, plainLanguage: 'Port is a dessert wine of not less than 18% alcohol by volume (and, as a wine, not more than 24%).' },

  // ---- Aperitif wine (§ 4.21(g)) ----
  { name: 'Vermouth', keywords: ['vermouth'], minAbv: 15, maxAbv: 24, citationSection: '27 CFR § 4.21(g)(2)', authority: S_421, plainLanguage: 'Vermouth is a type of aperitif wine, of not less than 15% alcohol by volume.' },
  { name: 'Aperitif wine', keywords: ['aperitif', 'wine'], minAbv: 15, maxAbv: 24, citationSection: '27 CFR § 4.21(g)(1)', authority: S_421, plainLanguage: 'Aperitif wine has an alcoholic content of not less than 15% by volume.' },

  // ---- Table / dessert grape wine by strength (§ 4.21(a)(5)-(6); also (e),(f)) ----
  { name: 'Dessert wine', keywords: ['dessert', 'wine'], minAbv: 14, maxAbv: 24, citationSection: '27 CFR § 4.21(a)(6)', authority: S_421, plainLanguage: 'Dessert wine has an alcoholic content over 14% but not over 24% by volume.' },
  { name: 'Table wine', keywords: ['table', 'wine'], minAbv: 7, maxAbv: 14, citationSection: '27 CFR § 4.21(a)(5)', authority: S_421, plainLanguage: 'Table wine has an alcoholic content not over 14% by volume.' },
];

/**
 * The Part 4 scope envelope (§ 4.6 / § 4.7), applied to any wine whose class/type
 * matched no specific standard above. The bounds are ASYMMETRIC on purpose:
 *   • above 24% ABV → FAIL: it is a distilled spirit under Part 5, not a wine.
 *   • below 7% ABV  → FLAG: it is outside Part 4 (an FDA-regulated low-alcohol
 *     product, e.g. many hard ciders) — a different regime, not a label defect.
 *   • 7–24%         → PASS: within the range Part 4 covers for wine.
 * A missing ABV FLAGs. This is why cider, perry, sake, mead and bare varietals
 * are evaluated rather than dropped: detected as wine, they land here.
 */
export function wineEnvelope(classType: string, abv: number | null | undefined): FieldVerdict {
  const base = {
    check: 'standards_of_identity',
    label: 'Standard of identity (class/type validity)',
    extracted: classType,
    citation: {
      section: '27 CFR § 4.6 / § 4.7',
      authority: S_46,
      plainLanguage:
        'Wine under the FAA Act contains not less than 7% and not more than 24% alcohol by volume; ' +
        'below 7% it is an FDA-regulated product, above 24% it is a distilled spirit (Part 5).',
    },
  } as const;

  if (abv == null) {
    return { ...base, verdict: 'FLAG', reason: `“${classType}” is a wine, but its ABV could not be read, so its Part 4 scope (7–24%) could not be confirmed. A reviewer should check.` };
  }
  if (abv > 24) {
    return { ...base, verdict: 'FAIL', reason: `“${classType}” at ${abv}% ABV exceeds 24% — above 24% it is a distilled spirit under Part 5, not a Part 4 wine.` };
  }
  if (abv < 7) {
    return { ...base, verdict: 'FLAG', reason: `“${classType}” at ${abv}% ABV is below the 7% Part 4 wine threshold — it may be an FDA-regulated low-alcohol product (e.g. a low-alcohol cider), not a TTB-labeled wine. A reviewer should confirm.` };
  }
  return { ...base, verdict: 'PASS', reason: `“${classType}” at ${abv}% ABV is within the 7–24% range Part 4 covers for wine.` };
}
