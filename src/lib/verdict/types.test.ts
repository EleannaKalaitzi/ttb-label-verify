import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rollup, type FieldVerdict, type Verdict } from './types';

function v(verdict: Verdict): FieldVerdict {
  return { check: 'x', label: 'X', verdict, reason: '' };
}

test('rollup: empty list is PASS', () => {
  assert.equal(rollup([]), 'PASS');
});

test('rollup: all PASS -> PASS', () => {
  assert.equal(rollup([v('PASS'), v('PASS')]), 'PASS');
});

test('rollup: any FLAG (no FAIL) -> FLAG', () => {
  assert.equal(rollup([v('PASS'), v('FLAG'), v('PASS')]), 'FLAG');
});

test('rollup: any FAIL dominates FLAG and PASS', () => {
  assert.equal(rollup([v('PASS'), v('FLAG'), v('FAIL')]), 'FAIL');
  assert.equal(rollup([v('FAIL'), v('PASS')]), 'FAIL');
  assert.equal(rollup([v('FLAG'), v('FAIL')]), 'FAIL');
});

test('rollup: single verdicts pass through', () => {
  assert.equal(rollup([v('PASS')]), 'PASS');
  assert.equal(rollup([v('FLAG')]), 'FLAG');
  assert.equal(rollup([v('FAIL')]), 'FAIL');
});
