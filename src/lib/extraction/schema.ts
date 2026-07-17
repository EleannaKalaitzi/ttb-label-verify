import { z } from 'zod';

/**
 * What the model is asked to report — ONLY what is printed on the label.
 *
 * Core design rule (CLAUDE.md): the model extracts, the code decides. Nothing
 * in this schema asks the model to compare, judge, or assess compliance. Every
 * field is a plain observation about the artwork. All matching and all
 * regulatory logic lives in TypeScript, downstream of this.
 *
 * Every readable-value field is nullable. An explicit `null` for an unreadable
 * field is load-bearing: without it the model infers a plausible value from
 * context, and a hallucinated ABV that happens to match the declared value is a
 * false PASS — the worst available outcome. Null converts a hallucination into
 * an honest FLAG.
 */

/** Alcohol content as printed. `abv_percent` and `proof` are independent
 *  observations; the code cross-checks them (proof should be 2 × ABV). */
const AlcoholContent = z.object({
  /** Stated alcohol by volume as a number, e.g. 45 for "45% Alc./Vol.".
   *  null if no ABV is legible on the label. */
  abv_percent: z.number().nullable(),
  /** Proof as printed, e.g. 90. null if no proof statement appears. */
  proof: z.number().nullable(),
});

/** The government health warning, observed verbatim. Bold judgments are the
 *  model's visual perception, not a measurement — the code treats them as
 *  advisory (FLAG, never FAIL). See CLAUDE.md § warning. */
const GovernmentWarning = z.object({
  /** Does a government warning statement appear on the label at all? */
  present: z.boolean(),
  /** The full warning text, transcribed exactly as printed (original casing,
   *  punctuation, spacing). null if not present or not legible. This is what
   *  the code checks verbatim against 27 CFR § 16.21. */
  text: z.string().nullable(),
  /** Are the first two words ("GOVERNMENT WARNING") in all capital letters?
   *  null if the warning is absent/illegible. */
  first_two_words_all_caps: z.boolean().nullable(),
  /** Are the first two words ("GOVERNMENT WARNING") in bold type? Advisory. */
  first_two_words_bold: z.boolean().nullable(),
  /** Is any of the remainder (everything after "GOVERNMENT WARNING") in bold
   *  type? § 16.22 forbids this — the routinely-missed rule. Advisory. */
  remainder_bold: z.boolean().nullable(),
  /** Does the warning appear as one continuous statement, separate and apart
   *  from other label copy (not interrupted by graphics/other text)? */
  is_continuous: z.boolean().nullable(),
});

export const ExtractionSchema = z.object({
  /** Brand name exactly as printed, e.g. "STONE'S THROW". null if illegible. */
  brand_name: z.string().nullable(),
  /** Class/type designation exactly as printed, e.g. "Kentucky Straight
   *  Bourbon Whiskey". null if illegible. */
  class_type: z.string().nullable(),
  alcohol_content: AlcoholContent,
  government_warning: GovernmentWarning,
});

export type Extraction = z.infer<typeof ExtractionSchema>;
export type AlcoholContent = z.infer<typeof AlcoholContent>;
export type GovernmentWarning = z.infer<typeof GovernmentWarning>;
