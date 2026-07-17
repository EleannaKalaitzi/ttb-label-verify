import type { FieldVerdict } from '../verdict/types';
import { cosmeticallyEqual, similarity } from './normalize';

/**
 * Cautious text comparison, reused across free-text fields (bottler, country):
 *   cosmetically identical → PASS; unreadable/missing → FLAG; plausibly the same
 *   but not identical → FLAG; clearly different → FAIL. PASS requires cosmetic
 *   equality — never an auto-PASS on a near-miss. Same policy as brand/class.
 */
export interface TextMatchOptions {
  check: string;
  label: string;
  /** Human field name used in the messages, e.g. "Producer/bottler". */
  fieldName: string;
  /** Below this normalized similarity, treat as clearly different (FAIL). */
  failBelow?: number;
}

export function cautiousTextMatch(
  declared: string | null | undefined,
  extracted: string | null | undefined,
  opts: TextMatchOptions,
): FieldVerdict {
  const failBelow = opts.failBelow ?? 0.5;
  const base = { check: opts.check, label: opts.label, declared, extracted } as const;

  if (extracted == null || extracted.trim() === '') {
    return { ...base, verdict: 'FLAG', reason: `${opts.fieldName} could not be read from the label. A reviewer should confirm it.` };
  }
  if (declared == null || declared.trim() === '') {
    return { ...base, verdict: 'FLAG', reason: `No ${opts.fieldName.toLowerCase()} was declared on the application to compare against.` };
  }
  if (cosmeticallyEqual(declared, extracted)) {
    return { ...base, verdict: 'PASS', reason: `${opts.fieldName} matches the application (ignoring case, punctuation, and spacing).` };
  }
  if (similarity(declared, extracted) >= failBelow) {
    return {
      ...base,
      verdict: 'FLAG',
      reason: `${opts.fieldName} differs from the application beyond cosmetic formatting (“${extracted}” vs “${declared}”). A reviewer should decide.`,
    };
  }
  return { ...base, verdict: 'FAIL', reason: `${opts.fieldName} does not match the application (“${extracted}” vs “${declared}”).` };
}
