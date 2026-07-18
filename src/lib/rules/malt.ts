import type { FieldVerdict } from '../verdict/types';
import { normalize } from '../compare/normalize';

/**
 * Malt beverages — 27 CFR Part 7.
 *
 * Part 7 assigns malt beverages NO numeric standard of identity: unlike spirits
 * (§ 5.143 — 40% floor) or wine (§ 4.6 — 7–24% envelope), there is no minimum or
 * maximum bottling strength for a malt beverage. A malt class/type ("beer",
 * "ale", "lager", "stout", "malt liquor"…) is a COMPOSITIONAL designation.
 *
 * So the standard of identity that genuinely applies to malt is the class/type
 * DESIGNATION itself (§ 7.63 requires one), and the checkable question is
 * recognition, not alcohol content:
 *   • a recognized malt designation → PASS (the designation is its standard of identity, and it is valid)
 *   • anything else                 → FLAG (confirm the designation or that a statement of composition is borne)
 *
 * There is deliberately no FAIL path: with no ABV threshold, a malt beverage
 * cannot be "under-proof". Recognized designations are drawn from Part 7 and
 * long-standing trade understanding — see ./sources/part-07-malt.md. This is why
 * there is no ABV table here (the spirits/wine shape does not fit malt).
 * Verified 2026-07-17.
 */

export const MALT_VERIFIED_AGAINST = '2026-07-17';
export const MALT_SOURCE = 'src/lib/rules/sources/part-07-malt.md';
const PART_7 = 'https://www.ecfr.gov/current/title-27/part-7';

interface MaltDesignation {
  name: string;
  /** Normalized keywords that must ALL appear in the class/type text. */
  keywords: string[];
}

/**
 * Recognized malt-beverage class/type designations, most-specific first. This is
 * a superset of the malt vocabulary the beverage classifier keys on, so any
 * class/type routed here as "malt" resolves to a named designation.
 */
const MALT_DESIGNATIONS: MaltDesignation[] = [
  { name: 'Flavored malt beverage', keywords: ['flavored', 'malt'] },
  { name: 'Malt liquor', keywords: ['malt', 'liquor'] },
  { name: 'Malt beverage', keywords: ['malt', 'beverage'] },
  { name: 'India pale ale', keywords: ['india', 'pale', 'ale'] },
  { name: 'India pale ale (IPA)', keywords: ['ipa'] },
  { name: 'Pale ale', keywords: ['pale', 'ale'] },
  { name: 'Brown ale', keywords: ['brown', 'ale'] },
  { name: 'Amber ale', keywords: ['amber', 'ale'] },
  { name: 'Blonde ale', keywords: ['blonde', 'ale'] },
  { name: 'Cream ale', keywords: ['cream', 'ale'] },
  { name: 'Wheat beer', keywords: ['wheat'] },
  { name: 'Pilsner', keywords: ['pilsner'] },
  { name: 'Pilsner', keywords: ['pils'] },
  { name: 'Bock', keywords: ['bock'] },
  { name: 'Saison', keywords: ['saison'] },
  { name: 'Stout', keywords: ['stout'] },
  { name: 'Porter', keywords: ['porter'] },
  { name: 'Lager', keywords: ['lager'] },
  { name: 'Ale', keywords: ['ale'] },
  { name: 'Beer', keywords: ['beer'] },
];

/** Most-specific recognized malt designation whose keywords all appear in the
 *  (normalized) class/type text, or null if none is recognized. */
function matchMaltDesignation(classType: string): MaltDesignation | null {
  const text = ` ${normalize(classType)} `;
  for (const d of MALT_DESIGNATIONS) {
    if (d.keywords.every((k) => text.includes(` ${k} `) || text.includes(` ${k}`) || text.includes(`${k} `))) {
      return d;
    }
  }
  return null;
}

const MALT_CITATION = {
  section: '27 CFR § 7.63 (Part 7 — Malt Beverages)',
  authority: PART_7,
  plainLanguage:
    'A malt beverage must bear a class or type designation (§ 7.63). Part 7 sets no minimum or ' +
    'maximum bottling strength, so a malt standard of identity is a compositional designation, not an ABV range.',
} as const;

/**
 * Evaluate a malt beverage's standard of identity by DESIGNATION RECOGNITION
 * (there is no ABV standard for malt). Recognized → PASS; unrecognized → FLAG.
 */
export function evaluateMalt(classType: string): FieldVerdict {
  const base = {
    check: 'standards_of_identity',
    label: 'Standard of identity (class/type validity)',
    extracted: classType,
    citation: MALT_CITATION,
  } as const;

  const d = matchMaltDesignation(classType);
  if (d) {
    return {
      ...base,
      verdict: 'PASS',
      reason:
        `“${d.name}” is a recognized malt-beverage class/type designation. Part 7 sets no bottling-` +
        `strength standard for malt beverages, so the designation itself is the standard of identity — ` +
        `and it is valid.`,
    };
  }
  return {
    ...base,
    verdict: 'FLAG',
    reason:
      `“${classType}” is handled as a malt beverage but is not a designation this tool recognizes. Malt ` +
      `beverages carry no ABV standard, so a reviewer should confirm the designation is proper or that ` +
      `the label bears a statement of composition.`,
  };
}
