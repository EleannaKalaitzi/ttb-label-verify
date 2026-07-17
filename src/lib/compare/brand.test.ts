import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareBrand } from './brand';

test('cosmetic-only difference PASSes (the STONE\'S THROW case)', () => {
  assert.equal(compareBrand("Stone's Throw", 'STONE’S THROW').verdict, 'PASS');
  assert.equal(compareBrand("Stone's Throw", 'Stones Throw').verdict, 'PASS');
});

test('unreadable or missing brand FLAGs, never fails silently', () => {
  assert.equal(compareBrand("Stone's Throw", null).verdict, 'FLAG');
  assert.equal(compareBrand("Stone's Throw", '  ').verdict, 'FLAG');
  assert.equal(compareBrand(null, 'STONE’S THROW').verdict, 'FLAG');
});

test('plausibly-same-but-different FLAGs (the ambiguous middle)', () => {
  // "Stone Throw" vs "Stone's Throw": beyond cosmetic, but likely the same.
  assert.equal(compareBrand("Stone's Throw", 'Stone Throw').verdict, 'FLAG');
});

test('clearly-different brand FAILs', () => {
  assert.equal(compareBrand("Stone's Throw", 'Stonewall').verdict, 'FAIL');
  assert.equal(compareBrand("Stone's Throw", 'Blue Ridge Distillery').verdict, 'FAIL');
});

test('a PASS carries no scary citation; every non-PASS explains itself', () => {
  const pass = compareBrand("Stone's Throw", 'STONE’S THROW');
  assert.equal(pass.verdict, 'PASS');
  const fail = compareBrand("Stone's Throw", 'Stonewall');
  assert.ok(fail.reason.length > 0);
});
