import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, cosmeticallyEqual, similarity, ratio } from './compare/normalize';
import { parseAbv, compareAbv, crossCheckProof } from './compare/abv';
import { compareBrand } from './compare/brand';
import { compareClassType } from './compare/classtype';
import { matchStandard, checkStandardOfIdentity, STANDARDS_OF_IDENTITY } from './rules/standards-of-identity';

// ---- normalize / similarity ----
test('normalize: empty and whitespace-only strings collapse to empty', () => {
  assert.equal(normalize(''), '');
  assert.equal(normalize('   \t  '), '');
});

test('ratio: identical=1, disjoint≈0, operates on raw input (punctuation kept)', () => {
  assert.equal(ratio('abc', 'abc'), 1);
  assert.equal(ratio('', 'abc'), 0);
  assert.ok(ratio('(1)', '(2)') > 0 && ratio('(1)', '(2)') < 1);
});

test('similarity strips punctuation before comparing; ratio does not', () => {
  assert.equal(similarity("o'brien", 'obrien'), 1); // cosmetic
  assert.ok(ratio("o'brien", 'obrien') < 1); // raw keeps the apostrophe
});

test('cosmeticallyEqual: accents, hyphens, ampersands', () => {
  assert.ok(cosmeticallyEqual('Café Noir', 'cafe noir'));
  assert.ok(cosmeticallyEqual('Jim-Beam', 'Jim Beam'));
});

// ---- ABV parsing & comparison ----
test('parseAbv: decimals, embedded, proof-style, junk', () => {
  assert.equal(parseAbv('40.5% Alc./Vol.'), 40.5);
  assert.equal(parseAbv('ABV 45'), 45);
  assert.equal(parseAbv(0), 0);
  assert.equal(parseAbv('proof only'), null);
  assert.equal(parseAbv(undefined), null);
});

test('compareAbv: epsilon boundary (45 vs 45.04 PASS; 45 vs 45.1 FAIL)', () => {
  assert.equal(compareAbv(45, 45.04).verdict, 'PASS');
  assert.equal(compareAbv(45, 45.1).verdict, 'FAIL');
});

test('crossCheckProof: tolerance boundary', () => {
  assert.equal(crossCheckProof(45, 90)?.verdict, 'PASS');
  assert.equal(crossCheckProof(45, 90.5)?.verdict, 'PASS'); // within 0.5
  assert.equal(crossCheckProof(45, 91)?.verdict, 'FLAG'); // beyond 0.5
  assert.equal(crossCheckProof(0, 0)?.verdict, 'PASS');
});

// ---- brand / class comparison edges ----
test('compareBrand: whitespace-only declared or extracted FLAGs', () => {
  assert.equal(compareBrand('   ', 'Anything').verdict, 'FLAG');
  assert.equal(compareBrand('Anything', '   ').verdict, 'FLAG');
});

test('compareClassType: accent/case cosmetic equality PASSes', () => {
  assert.equal(compareClassType('Añejo Tequila', 'ANEJO TEQUILA').verdict, 'PASS');
});

// ---- standards of identity: every table class resolves & 40% boundary ----
test('every standards-of-identity entry is matchable by its own name', () => {
  for (const soi of STANDARDS_OF_IDENTITY) {
    assert.ok(matchStandard(soi.name), `unmatched: ${soi.name}`);
  }
});

test('minimum-strength boundary: exactly 40 PASSes, 39.9 FAILs', () => {
  assert.equal(checkStandardOfIdentity('Vodka', 40).verdict, 'PASS');
  assert.equal(checkStandardOfIdentity('Vodka', 39.9).verdict, 'FAIL');
});

test('class coverage: gin, rum, brandy, tequila, mezcal, scotch all resolve to § 5.x', () => {
  for (const [text, section] of [
    ['London Dry Gin', '§ 5.144'],
    ['Aged Rum', '§ 5.147'],
    ['Apple Brandy', '§ 5.145'],
    ['Blanco Tequila', '§ 5.148'],
    ['Mezcal', '§ 5.148'],
    ['Blended Scotch Whisky', '§ 5.143'],
  ] as const) {
    const v = checkStandardOfIdentity(text, 45);
    assert.equal(v.verdict, 'PASS');
    assert.match(v.citation?.section ?? '', new RegExp(section.replace('.', '\\.')));
  }
});

test('a spirit outside the encoded standards is flagged as a § 5.156 specialty product, never guessed', () => {
  // Generic/geographic spirits with no numeric standard → specialty product FLAG.
  assert.equal(checkStandardOfIdentity('Aquavit', 42).verdict, 'FLAG');
  assert.equal(checkStandardOfIdentity('Absinthe', 60).verdict, 'FLAG');
});

test('malt beverages ARE evaluated — by designation recognition (§ 7.63), not ABV', () => {
  for (const [designation] of [
    ['India Pale Ale'],
    ['Imperial Stout'],
    ['Vienna Lager'],
    ['Malt Liquor'],
    ['Robust Porter'],
  ] as const) {
    const v = checkStandardOfIdentity(designation, 6.5);
    assert.equal(v.verdict, 'PASS', `${designation} should be a recognized malt designation`);
    assert.match(v.reason, /recognized malt-beverage/i);
    assert.match(v.citation?.section ?? '', /7\.63/);
  }
});
