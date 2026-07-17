import type { FieldVerdict } from '../verdict/types';
import { cosmeticallyEqual, similarity } from './normalize';

/**
 * Class/type comparison against the application. Same "Cautious" policy as
 * brand: PASS only on cosmetic equality; residual differences FLAG unless the
 * two are clearly different, in which case FAIL. Separate from the standards-of-
 * identity validity check (that one asks whether the designation is lawful at
 * the stated ABV, regardless of the application).
 */

export const CLASS_TYPE_FAIL_BELOW = 0.5;

export function compareClassType(
  declared: string | null | undefined,
  extracted: string | null | undefined,
): FieldVerdict {
  const base = { check: 'class_type', label: 'Class / type', declared, extracted } as const;

  if (extracted == null || extracted.trim() === '') {
    return {
      ...base,
      verdict: 'FLAG',
      reason: 'Class/type designation could not be read from the label. A reviewer should confirm it.',
    };
  }
  if (declared == null || declared.trim() === '') {
    return {
      ...base,
      verdict: 'FLAG',
      reason: 'No class/type was declared on the application to compare against.',
    };
  }

  if (cosmeticallyEqual(declared, extracted)) {
    return {
      ...base,
      verdict: 'PASS',
      reason: 'Class/type matches the application (ignoring case, punctuation, and spacing).',
    };
  }

  const sim = similarity(declared, extracted);
  if (sim >= CLASS_TYPE_FAIL_BELOW) {
    return {
      ...base,
      verdict: 'FLAG',
      reason:
        `Class/type differs from the application beyond cosmetic formatting ` +
        `(“${extracted}” vs “${declared}”). A reviewer should decide.`,
    };
  }

  return {
    ...base,
    verdict: 'FAIL',
    reason: `Class/type does not match the application (“${extracted}” vs “${declared}”).`,
  };
}
