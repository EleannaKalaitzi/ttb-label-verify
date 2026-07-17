import type { Extraction } from '../extraction/schema';
import type { Verdict } from '../verdict/types';
import type { ApplicationData } from '../verify/verify';
import { REQUIRED_WARNING_TEXT } from '../extraction/prompt';

/**
 * Adversarial test fixtures, defined as DATA.
 *
 * Each fixture targets exactly one regulatory or comparison point, and ships
 * with its expected overall verdict — so the set is both a demo corpus and the
 * measurement corpus. From one spec we derive two things: the rendered label
 * image (scripts/render-fixtures.ts) and the "perfect read" extraction a vision
 * model should produce (used to drive fixture-aware mock mode, so the whole app
 * demonstrates PASS/FLAG/FAIL variety with no API key).
 *
 * Synthetic HTML/SVG-style labels rather than generated photos: image
 * generation cannot reliably render exact legal text, and a mangled warning is
 * useless when the task is exact-match verification. This gives pixel-exact,
 * deterministic control over the adversarial cases.
 */

export interface WarningSpec {
  /** Warning text exactly as printed on the label. */
  text: string;
  /** Are the first two words rendered in ALL CAPS? */
  prefixCaps: boolean;
  /** Are the first two words rendered bold? */
  prefixBold: boolean;
  /** Is any of the remainder rendered bold? */
  remainderBold: boolean;
  /** Is it one continuous statement set apart from other copy? */
  continuous: boolean;
}

export interface LabelSpec {
  id: string;
  title: string;
  /** What this fixture is designed to exercise. */
  targets: string;
  // ---- what is printed on the label ----
  brand: string;
  classType: string;
  abv: number | null;
  proof: number | null;
  /** Optional; default the standard values below (so a fixture only sets what
   *  it's testing). */
  netContents?: string | null;
  bottler?: string | null;
  country?: string | null;
  warning: WarningSpec | null; // null => no warning printed
  // ---- the application it is checked against ----
  declared: ApplicationData;
  // ---- the expected result (measurement) ----
  expectedOverall: Verdict;
  expectedNote: string;
}

/** Title-case the "GOVERNMENT WARNING:" prefix, leave the rest as-is. */
const titleCasePrefix = REQUIRED_WARNING_TEXT.replace('GOVERNMENT WARNING:', 'Government Warning:');

const CLEAN_WARNING: WarningSpec = {
  text: REQUIRED_WARNING_TEXT,
  prefixCaps: true,
  prefixBold: true,
  remainderBold: false,
  continuous: true,
};

const DEFAULT_NET_CONTENTS = '750 mL';
const DEFAULT_BOTTLER = "Stone's Throw Distillery, Louisville, KY";

const STANDARD_APP: ApplicationData = {
  brand_name: "Stone's Throw",
  class_type: 'Kentucky Straight Bourbon Whiskey',
  alcohol_content: '45%',
  net_contents: DEFAULT_NET_CONTENTS,
  producer_bottler: DEFAULT_BOTTLER,
  country_of_origin: null,
};

export const FIXTURES: LabelSpec[] = [
  {
    id: '01-clean-pass',
    title: 'Clean, compliant label',
    targets:
      "Baseline — all checks pass. Also demonstrates cosmetic brand matching: the label reads STONE'S THROW, the application reads Stone's Throw, and that difference does NOT fail.",
    brand: "STONE'S THROW",
    classType: 'Kentucky Straight Bourbon Whiskey',
    abv: 45,
    proof: 90,
    warning: CLEAN_WARNING,
    declared: STANDARD_APP,
    expectedOverall: 'PASS',
    expectedNote: 'Everything matches and complies (cosmetic brand-case difference ignored).',
  },
  {
    id: '02-warning-title-case',
    title: 'Title-case "Government Warning"',
    targets: '§ 16.22 — the two-word prefix is not in capital letters.',
    brand: "STONE'S THROW",
    classType: 'Kentucky Straight Bourbon Whiskey',
    abv: 45,
    proof: 90,
    warning: { text: titleCasePrefix, prefixCaps: false, prefixBold: true, remainderBold: false, continuous: true },
    declared: STANDARD_APP,
    expectedOverall: 'FAIL',
    expectedNote: 'Prefix not in capital letters → FAIL (§ 16.22).',
  },
  {
    id: '03-warning-fully-bold',
    title: 'Entire warning bolded',
    targets: '§ 16.22 remainder rule — the routinely-missed check.',
    brand: "STONE'S THROW",
    classType: 'Kentucky Straight Bourbon Whiskey',
    abv: 45,
    proof: 90,
    warning: { text: REQUIRED_WARNING_TEXT, prefixCaps: true, prefixBold: true, remainderBold: true, continuous: true },
    declared: STANDARD_APP,
    expectedOverall: 'FLAG',
    expectedNote: 'Remainder appears bold → FLAG (§ 16.22); bold detection is advisory.',
  },
  {
    id: '04-warning-missing',
    title: 'No government warning',
    targets: '§ 16.21 — the mandatory warning is absent.',
    brand: "STONE'S THROW",
    classType: 'Kentucky Straight Bourbon Whiskey',
    abv: 45,
    proof: 90,
    warning: null,
    declared: STANDARD_APP,
    expectedOverall: 'FAIL',
    expectedNote: 'Warning is mandatory and absent → FAIL (§ 16.21).',
  },
  {
    id: '05-bourbon-38',
    title: 'Bourbon bottled at 38%',
    targets:
      'Standards of identity — non-compliant even though it matches its application perfectly (brand, class, and ABV all agree).',
    brand: "STONE'S THROW",
    classType: 'Kentucky Straight Bourbon Whiskey',
    abv: 38,
    proof: 76,
    warning: CLEAN_WARNING,
    declared: { ...STANDARD_APP, alcohol_content: '38%' },
    expectedOverall: 'FAIL',
    expectedNote: 'Below 40% minimum bottling strength → FAIL (§ 5.143), despite matching the application.',
  },
  {
    id: '06-proof-inconsistent',
    title: 'Proof inconsistent with ABV',
    targets: 'Internal-consistency cross-check (proof ≈ 2 × ABV), independent of the application.',
    brand: "STONE'S THROW",
    classType: 'Kentucky Straight Bourbon Whiskey',
    abv: 45,
    proof: 100,
    warning: CLEAN_WARNING,
    declared: STANDARD_APP,
    expectedOverall: 'FLAG',
    expectedNote: 'Proof 100 implies 50% ABV but the label says 45% → FLAG (internal inconsistency).',
  },
];

/** The "perfect read" a vision model should produce for a fixture. */
export function deriveExtraction(spec: LabelSpec): Extraction {
  return {
    brand_name: spec.brand,
    class_type: spec.classType,
    alcohol_content: { abv_percent: spec.abv, proof: spec.proof },
    net_contents: spec.netContents ?? DEFAULT_NET_CONTENTS,
    producer_bottler: spec.bottler ?? DEFAULT_BOTTLER,
    country_of_origin: spec.country ?? null,
    government_warning: spec.warning
      ? {
          present: true,
          text: spec.warning.text,
          first_two_words_all_caps: spec.warning.prefixCaps,
          first_two_words_bold: spec.warning.prefixBold,
          remainder_bold: spec.warning.remainderBold,
          is_continuous: spec.warning.continuous,
        }
      : {
          present: false,
          text: null,
          first_two_words_all_caps: null,
          first_two_words_bold: null,
          remainder_bold: null,
          is_continuous: null,
        },
  };
}
