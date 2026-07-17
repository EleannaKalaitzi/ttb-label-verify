import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkWarning } from './warning';
import type { GovernmentWarning } from '../extraction/schema';
import { REQUIRED_WARNING_TEXT } from '../extraction/prompt';

/** A fully-compliant warning; tests override single fields. */
function clean(over: Partial<GovernmentWarning> = {}): GovernmentWarning {
  return {
    present: true,
    text: REQUIRED_WARNING_TEXT,
    first_two_words_all_caps: true,
    first_two_words_bold: true,
    remainder_bold: false,
    is_continuous: true,
    ...over,
  };
}

function byCheck(vs: ReturnType<typeof checkWarning>, check: string) {
  const v = vs.find((x) => x.check === check);
  assert.ok(v, `missing check ${check}`);
  return v!;
}

test('a clean warning passes all three checks', () => {
  const vs = checkWarning(clean());
  assert.equal(vs.length, 3);
  assert.ok(vs.every((v) => v.verdict === 'PASS'));
});

test('missing warning is a single decisive § 16.21 FAIL', () => {
  const vs = checkWarning(clean({ present: false, text: null }));
  assert.equal(vs.length, 1);
  assert.equal(vs[0].verdict, 'FAIL');
  assert.equal(vs[0].citation?.section, '27 CFR § 16.21');
});

test('title-case "Government Warning" FAILs the caps rule (§ 16.22)', () => {
  const vs = checkWarning(clean({ first_two_words_all_caps: false }));
  const v = byCheck(vs, 'warning.prefix_caps_and_bold');
  assert.equal(v.verdict, 'FAIL');
  assert.equal(v.citation?.section, '27 CFR § 16.22');
});

test('fully-bolded warning is surfaced on the remainder rule (§ 16.22)', () => {
  // The differentiator: the remainder-not-bold rule exists at all and cites its
  // authority. Bold is advisory -> FLAG (per CLAUDE.md severity policy).
  const vs = checkWarning(clean({ remainder_bold: true }));
  const v = byCheck(vs, 'warning.remainder_not_bold');
  assert.equal(v.verdict, 'FLAG');
  assert.match(v.reason, /misread as .all caps and bold/i);
  assert.equal(v.citation?.section, '27 CFR § 16.22');
});

test('correct wording but not continuous FAILs § 16.21', () => {
  const vs = checkWarning(clean({ is_continuous: false }));
  const v = byCheck(vs, 'warning.text_verbatim');
  assert.equal(v.verdict, 'FAIL');
});

test('wrong wording FAILs; a near-identical transcription FLAGs', () => {
  const wrong = checkWarning(clean({ text: 'Drink responsibly. Not for pregnant women.' }));
  assert.equal(byCheck(wrong, 'warning.text_verbatim').verdict, 'FAIL');

  // One-character artifact -> very high similarity -> FLAG, not FAIL.
  const artifact = checkWarning(clean({ text: REQUIRED_WARNING_TEXT.replace('machinery', 'machinery.') }));
  assert.equal(byCheck(artifact, 'warning.text_verbatim').verdict, 'FLAG');
});

test('unreadable bold/caps flags FLAG rather than guessing', () => {
  const vs = checkWarning(
    clean({ first_two_words_all_caps: null, first_two_words_bold: null, remainder_bold: null }),
  );
  assert.equal(byCheck(vs, 'warning.prefix_caps_and_bold').verdict, 'FLAG');
  assert.equal(byCheck(vs, 'warning.remainder_not_bold').verdict, 'FLAG');
});
