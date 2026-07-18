import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNetContentsMl, compareNetContents } from './net-contents';

test('metric units parse to millilitres', () => {
  assert.equal(parseNetContentsMl('750 mL'), 750);
  assert.equal(parseNetContentsMl('750ml'), 750);
  assert.equal(parseNetContentsMl('0.75 L'), 750);
  assert.equal(parseNetContentsMl('75 cl'), 750);
});

test('U.S. fluid measures parse to millilitres (malt beverages use fl oz)', () => {
  assert.ok(Math.abs(parseNetContentsMl('12 fl oz')! - 354.882) < 0.01);
  assert.ok(Math.abs(parseNetContentsMl('12 fl. oz.')! - 354.882) < 0.01);
  assert.ok(Math.abs(parseNetContentsMl('12oz')! - 354.882) < 0.01);
  assert.ok(Math.abs(parseNetContentsMl('12 fluid ounces')! - 354.882) < 0.01);
  assert.ok(Math.abs(parseNetContentsMl('1 pint')! - 473.176) < 0.01);
  assert.ok(Math.abs(parseNetContentsMl('1 quart')! - 946.352) < 0.01);
});

test('unrecognized or missing units return null', () => {
  assert.equal(parseNetContentsMl('abc'), null);
  assert.equal(parseNetContentsMl(''), null);
  assert.equal(parseNetContentsMl(null), null);
});

test('metric and U.S. measures cross-compare within tolerance', () => {
  // 12 fl oz ≈ 355 mL, 16 fl oz = 1 pint.
  assert.equal(compareNetContents('355 mL', '12 fl oz').verdict, 'PASS');
  assert.equal(compareNetContents('1 pint', '16 fl oz').verdict, 'PASS');
});

test('a genuine volume difference FAILs', () => {
  assert.equal(compareNetContents('750 mL', '700 mL').verdict, 'FAIL');
  assert.equal(compareNetContents('12 fl oz', '16 fl oz').verdict, 'FAIL');
});

test('un-parseable units FLAG rather than guess', () => {
  assert.equal(compareNetContents('one bottle', 'a can').verdict, 'FLAG');
});
