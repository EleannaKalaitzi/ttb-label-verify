import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verify, type ApplicationData } from './verify';
import type { Extraction } from '../extraction/schema';
import { REQUIRED_WARNING_TEXT } from '../extraction/prompt';

function label(over: Partial<Extraction> = {}): Extraction {
  return {
    brand_name: "STONE'S THROW",
    class_type: 'Kentucky Straight Bourbon Whiskey',
    alcohol_content: { abv_percent: 45, proof: 90 },
    net_contents: '750 mL',
    producer_bottler: "Stone's Throw Distillery, Louisville, KY",
    country_of_origin: null,
    government_warning: {
      present: true,
      text: REQUIRED_WARNING_TEXT,
      first_two_words_all_caps: true,
      first_two_words_bold: true,
      remainder_bold: false,
      is_continuous: true,
    },
    ...over,
  };
}

const application: ApplicationData = {
  brand_name: "Stone's Throw",
  class_type: 'Kentucky Straight Bourbon Whiskey',
  alcohol_content: '45%',
  net_contents: '750 mL',
  producer_bottler: "Stone's Throw Distillery, Louisville, KY",
  country_of_origin: null,
};

test('a fully-compliant label rolls up to PASS', () => {
  const r = verify(label(), application);
  assert.equal(r.overall, 'PASS');
});

test('cosmetic brand difference alone stays PASS', () => {
  // label says STONE'S THROW, application says Stone's Throw
  const r = verify(label(), application);
  const brand = r.verdicts.find((v) => v.check === 'brand_name');
  assert.equal(brand?.verdict, 'PASS');
});

test('bourbon at 38% FAILs overall on standards of identity — even matching its application', () => {
  const app: ApplicationData = { ...application, alcohol_content: '38%' };
  const r = verify(label({ alcohol_content: { abv_percent: 38, proof: 76 } }), app);
  assert.equal(r.overall, 'FAIL');
  const soi = r.verdicts.find((v) => v.check === 'standards_of_identity');
  assert.equal(soi?.verdict, 'FAIL');
});

test('ABV mismatch (label 45, application 40) FAILs overall', () => {
  const app: ApplicationData = { ...application, alcohol_content: '40%' };
  const r = verify(label(), app);
  assert.equal(r.overall, 'FAIL');
});

test('every non-PASS verdict carries a plain-language reason', () => {
  const app: ApplicationData = { ...application, alcohol_content: '40%' };
  const r = verify(label(), app);
  for (const v of r.verdicts) {
    if (v.verdict !== 'PASS') assert.ok(v.reason.length > 0, `${v.check} missing reason`);
  }
});

test('failed extraction never guesses — it FLAGs for a human', () => {
  const r = verify(null, application);
  assert.equal(r.overall, 'FLAG');
  assert.equal(r.verdicts.length, 1);
});
