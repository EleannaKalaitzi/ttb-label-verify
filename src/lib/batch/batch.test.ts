import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyLabelOnly } from '../verify/verify';
import { batchToCsv } from './csv';
import type { BatchJob } from './job';
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

// ---- verifyLabelOnly ----
test('verifyLabelOnly: clean label is PASS and runs no application-comparison checks', () => {
  const r = verifyLabelOnly(label());
  assert.equal(r.overall, 'PASS');
  // Only regulatory + proof checks — no brand/class/abv/net/bottler/country.
  assert.ok(!r.verdicts.some((v) => v.check === 'brand_name'));
  assert.ok(r.verdicts.some((v) => v.check === 'standards_of_identity'));
});

test('verifyLabelOnly: bourbon at 38% still FAILs (label-intrinsic)', () => {
  const r = verifyLabelOnly(label({ alcohol_content: { abv_percent: 38, proof: 76 } }));
  assert.equal(r.overall, 'FAIL');
});

test('verifyLabelOnly: null extraction FLAGs for review', () => {
  assert.equal(verifyLabelOnly(null).overall, 'FLAG');
});

// ---- CSV ----
function jobWith(items: BatchJob['items']): BatchJob {
  return { id: 'test1234', createdAt: 0, total: items.length, completed: items.length, status: 'done', items };
}

test('batchToCsv: header + one row per item, only non-PASS checks listed', () => {
  const job = jobWith([
    { index: 0, filename: 'a.png', status: 'done', overall: 'PASS', verdicts: [{ check: 'x', label: 'X', verdict: 'PASS', reason: 'ok' }], latencyMs: 10, cached: false, error: null },
    { index: 1, filename: 'b.png', status: 'done', overall: 'FAIL', verdicts: [{ check: 'standards_of_identity', label: 'Standard of identity', verdict: 'FAIL', reason: 'below 40%', citation: { section: '27 CFR § 5.143', authority: 'https://x', plainLanguage: 'p' } }], latencyMs: 10, cached: false, error: null },
  ]);
  const csv = batchToCsv(job);
  const lines = csv.split('\r\n');
  assert.equal(lines[0], '#,filename,overall,failing_checks,reasons,citations');
  assert.equal(lines.length, 3);
  assert.match(lines[1], /^1,a\.png,PASS,,,$/); // PASS row: no failing checks
  assert.match(lines[2], /2,b\.png,FAIL,.*Standard of identity.*5\.143/);
});

test('batchToCsv: fields with commas/quotes are RFC-4180 quoted', () => {
  const job = jobWith([
    { index: 0, filename: 'x,1.png', status: 'done', overall: 'FLAG', verdicts: [{ check: 'w', label: 'Warning', verdict: 'FLAG', reason: 'says "hi", maybe' }], latencyMs: 1, cached: false, error: null },
  ]);
  const line = batchToCsv(job).split('\r\n')[1];
  assert.ok(line.includes('"x,1.png"'));
  assert.ok(line.includes('""hi""'));
});
