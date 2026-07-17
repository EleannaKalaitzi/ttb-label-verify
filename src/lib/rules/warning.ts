import type { FieldVerdict } from '../verdict/types';
import type { GovernmentWarning } from '../extraction/schema';
import { ratio } from '../compare/normalize';
import { REQUIRED_WARNING_TEXT } from '../extraction/prompt';
import {
  WARNING_TEXT_VERBATIM,
  WARNING_PREFIX_CAPS_AND_BOLD,
  WARNING_REMAINDER_NOT_BOLD,
} from './warning-rules';

/**
 * The government health-warning checks — three independent rules, three
 * citations, three verdicts.
 *
 * Severity policy (deliberate; see CLAUDE.md):
 *   - CASING is authoritative — read directly from the transcription. A
 *     title-case "Government Warning" FAILs § 16.22.
 *   - BOLD is the model's visual judgment, not a measurement. A bold-rule
 *     issue yields FLAG, not FAIL, with the citation shown so the reviewer
 *     confirms in one glance. The tool must not overstate its own confidence.
 *
 * (Note: PLAN.md's demo script narrates the fully-bolded case as a FAIL, which
 * contradicts this reasoned FLAG decision — flagged to the stakeholder. The
 * code follows the spec: bold => FLAG. Either way, this tool SURFACES the
 * remainder-bold issue with its citation, which is the whole differentiator.)
 */

/** Above this similarity, a wording difference is treated as a likely
 *  transcription artifact (FLAG) rather than genuinely wrong text (FAIL).
 *  PROVISIONAL — tune against the corpus (PLAN.md Session 6). */
export const WARNING_WORDING_FLAG_ABOVE = 0.97;

/** Normalize warning wording for comparison: casing and whitespace are handled
 *  by separate checks / are cosmetic, but punctuation and words are significant
 *  and preserved. */
function normalizeWording(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function checkWarning(w: GovernmentWarning): FieldVerdict[] {
  // If there is no warning at all, that's a single, decisive § 16.21 failure —
  // the caps/bold checks have nothing to evaluate.
  if (!w.present || w.text == null || w.text.trim() === '') {
    return [
      {
        check: 'warning.text_verbatim',
        label: 'Health warning present & verbatim',
        verdict: 'FAIL',
        reason: 'No government health warning was found on the label. It is mandatory.',
        citation: WARNING_TEXT_VERBATIM,
      },
    ];
  }

  return [
    checkTextVerbatim(w),
    checkPrefixCapsAndBold(w),
    checkRemainderNotBold(w),
  ];
}

/** § 16.21 — exact wording, continuous and separate. */
function checkTextVerbatim(w: GovernmentWarning): FieldVerdict {
  const base = {
    check: 'warning.text_verbatim',
    label: 'Health warning present & verbatim',
    declared: REQUIRED_WARNING_TEXT,
    extracted: w.text,
    citation: WARNING_TEXT_VERBATIM,
  } as const;

  const got = normalizeWording(w.text!);
  const want = normalizeWording(REQUIRED_WARNING_TEXT);

  if (got !== want) {
    const sim = ratio(got, want);
    if (sim >= WARNING_WORDING_FLAG_ABOVE) {
      return {
        ...base,
        verdict: 'FLAG',
        reason:
          'The warning wording differs slightly from the statutory text. This may be a ' +
          'transcription artifact — a reviewer should compare it against § 16.21 by eye.',
      };
    }
    return {
      ...base,
      verdict: 'FAIL',
      reason: 'The warning wording does not match the exact statutory text required by § 16.21.',
    };
  }

  // Wording is correct; § 16.21 also requires it be continuous and set apart.
  if (w.is_continuous === false) {
    return {
      ...base,
      verdict: 'FAIL',
      reason:
        'The warning wording is correct but it is not one continuous statement set apart from ' +
        'other label copy, as § 16.21 requires.',
    };
  }
  if (w.is_continuous == null) {
    return {
      ...base,
      verdict: 'FLAG',
      reason:
        'The warning wording is correct, but whether it is continuous and set apart could not be ' +
        'determined from the image. A reviewer should confirm.',
    };
  }

  return {
    ...base,
    verdict: 'PASS',
    reason: 'The warning uses the exact statutory wording, continuous and set apart.',
  };
}

/** § 16.22 — "GOVERNMENT WARNING" in capital letters and bold. Caps is
 *  authoritative (FAIL); bold is advisory (FLAG). */
function checkPrefixCapsAndBold(w: GovernmentWarning): FieldVerdict {
  const base = {
    check: 'warning.prefix_caps_and_bold',
    label: '“GOVERNMENT WARNING” in caps & bold',
    citation: WARNING_PREFIX_CAPS_AND_BOLD,
  } as const;

  if (w.first_two_words_all_caps === false) {
    return {
      ...base,
      verdict: 'FAIL',
      reason:
        'The words “GOVERNMENT WARNING” are not in all capital letters. § 16.22 requires capitals.',
    };
  }
  if (w.first_two_words_all_caps == null) {
    return {
      ...base,
      verdict: 'FLAG',
      reason: 'Could not tell whether “GOVERNMENT WARNING” is in capitals. A reviewer should confirm.',
    };
  }
  if (w.first_two_words_bold === false) {
    return {
      ...base,
      verdict: 'FLAG',
      reason:
        '“GOVERNMENT WARNING” appears not to be bold, which § 16.22 requires. Bold detection is a ' +
        'visual judgment — a reviewer should confirm in one glance.',
    };
  }
  if (w.first_two_words_bold == null) {
    return {
      ...base,
      verdict: 'FLAG',
      reason: 'Could not tell whether “GOVERNMENT WARNING” is bold. A reviewer should confirm.',
    };
  }
  return {
    ...base,
    verdict: 'PASS',
    reason: '“GOVERNMENT WARNING” appears in capital letters and bold type.',
  };
}

/** § 16.22 — the remainder may NOT be bold. The routinely-missed rule. Bold is
 *  advisory, so a violation is FLAG. */
function checkRemainderNotBold(w: GovernmentWarning): FieldVerdict {
  const base = {
    check: 'warning.remainder_not_bold',
    label: 'Remainder of warning not bold',
    citation: WARNING_REMAINDER_NOT_BOLD,
  } as const;

  if (w.remainder_bold === true) {
    return {
      ...base,
      verdict: 'FLAG',
      reason:
        'The text after “GOVERNMENT WARNING” appears to be in bold, which § 16.22 forbids — only ' +
        'the first two words may be bold. (This rule is commonly misread as “all caps and bold.”) ' +
        'Bold detection is a visual judgment; a reviewer should confirm.',
    };
  }
  if (w.remainder_bold == null) {
    return {
      ...base,
      verdict: 'FLAG',
      reason:
        'Could not tell whether the remainder of the warning is bold. § 16.22 forbids it — a ' +
        'reviewer should confirm.',
    };
  }
  return {
    ...base,
    verdict: 'PASS',
    reason: 'Only “GOVERNMENT WARNING” is bold; the remainder is not, as § 16.22 requires.',
  };
}
