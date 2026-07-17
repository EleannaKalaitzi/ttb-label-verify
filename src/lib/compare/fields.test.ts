import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNetContentsMl, compareNetContents } from './net-contents';
import { compareBottler } from './bottler';
import { compareCountry } from './country';

// ---- net contents ----
test('parseNetContentsMl: units normalize to millilitres', () => {
  assert.equal(parseNetContentsMl('750 mL'), 750);
  assert.equal(parseNetContentsMl('750ml'), 750);
  assert.equal(parseNetContentsMl('0.75 L'), 750);
  assert.equal(parseNetContentsMl('1 L'), 1000);
  assert.equal(parseNetContentsMl('50 cL'), 500);
  assert.equal(parseNetContentsMl('1,000 mL'), 1000);
  assert.equal(parseNetContentsMl('no size'), null);
  assert.equal(parseNetContentsMl(null), null);
});

test('compareNetContents: equal volumes PASS across units; different FAIL', () => {
  assert.equal(compareNetContents('750 mL', '750 mL').verdict, 'PASS');
  assert.equal(compareNetContents('0.75 L', '750 mL').verdict, 'PASS');
  assert.equal(compareNetContents('750 mL', '700 mL').verdict, 'FAIL');
});

test('compareNetContents: unreadable / undeclared / un-parseable all FLAG', () => {
  assert.equal(compareNetContents('750 mL', null).verdict, 'FLAG');
  assert.equal(compareNetContents(null, '750 mL').verdict, 'FLAG');
  assert.equal(compareNetContents('750 mL', 'a big bottle').verdict, 'FLAG');
});

// ---- producer / bottler ----
test('compareBottler: cosmetic difference PASSes; clearly different FAILs; missing FLAGs', () => {
  assert.equal(
    compareBottler("Stone's Throw Distillery, Louisville, KY", "STONE'S THROW DISTILLERY, LOUISVILLE, KY").verdict,
    'PASS',
  );
  assert.equal(compareBottler("Stone's Throw Distillery, Louisville, KY", 'Acme Beverages, Newark, NJ').verdict, 'FAIL');
  assert.equal(compareBottler("Stone's Throw Distillery, Louisville, KY", null).verdict, 'FLAG');
});

// ---- country of origin ----
test('compareCountry: both absent — domestic ONLY with U.S. producer evidence, else FLAG', () => {
  // No evidence of origin → never assume domestic → FLAG for review
  assert.equal(compareCountry(null, null).verdict, 'FLAG');
  assert.equal(compareCountry(null, null, 'Acme Beverages').verdict, 'FLAG');
  // Foreign producer, no country stated → still FLAG
  assert.equal(compareCountry(null, null, 'Highland Distillers, Edinburgh').verdict, 'FLAG');
  // U.S. producer address → positive evidence of domestic → PASS
  assert.equal(compareCountry(null, null, "Stone's Throw Distillery, Louisville, KY").verdict, 'PASS');
  assert.equal(compareCountry(null, null, 'Napa Cellars, USA').verdict, 'PASS');
});

test('compareCountry: declared-but-not-on-label, and on-label-but-not-declared, both FLAG', () => {
  assert.equal(compareCountry('Scotland', null).verdict, 'FLAG');
  assert.equal(compareCountry(null, 'Product of France').verdict, 'FLAG');
});

test('compareCountry: matching (with lead-in stripped) PASSes; mismatch FAILs', () => {
  assert.equal(compareCountry('Scotland', 'Product of Scotland').verdict, 'PASS');
  assert.equal(compareCountry('Scotland', 'Product of France').verdict, 'FAIL');
});
