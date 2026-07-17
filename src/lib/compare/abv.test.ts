import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAbv, compareAbv, crossCheckProof } from './abv';

test('parseAbv reads number, plain, percent, and full statements alike', () => {
  assert.equal(parseAbv(45), 45);
  assert.equal(parseAbv('45'), 45);
  assert.equal(parseAbv('45%'), 45);
  assert.equal(parseAbv('45.0% Alc./Vol.'), 45);
  assert.equal(parseAbv(null), null);
  assert.equal(parseAbv('n/a'), null);
});

test('equal ABV PASSes, including 45 vs 45.0', () => {
  assert.equal(compareAbv(45, 45).verdict, 'PASS');
  assert.equal(compareAbv('45.0%', 45).verdict, 'PASS');
});

test('mismatched ABV FAILs (fixture: label 45, application 40)', () => {
  assert.equal(compareAbv(40, 45).verdict, 'FAIL');
  assert.equal(compareAbv(45, 45.5).verdict, 'FAIL');
});

test('unreadable ABV FLAGs rather than guessing', () => {
  assert.equal(compareAbv(45, null).verdict, 'FLAG');
  assert.equal(compareAbv(null, 45).verdict, 'FLAG');
});

test('proof cross-check: consistent passes, inconsistent flags', () => {
  assert.equal(crossCheckProof(45, 90)?.verdict, 'PASS');
  // fixture: proof inconsistent with stated ABV
  assert.equal(crossCheckProof(45, 100)?.verdict, 'FLAG');
});

test('proof cross-check is skipped when the label omits one figure', () => {
  assert.equal(crossCheckProof(45, null), null);
  assert.equal(crossCheckProof(null, 90), null);
});
