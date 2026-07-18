import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchStandard, checkStandardOfIdentity } from './standards-of-identity';

test('matchStandard prefers the most specific designation', () => {
  assert.equal(matchStandard('Kentucky Straight Bourbon Whiskey')?.name, 'Straight Bourbon Whiskey');
  assert.equal(matchStandard('Blended Scotch Whisky')?.name, 'Scotch Whisky');
  assert.equal(matchStandard('Vodka')?.name, 'Vodka');
});

test('the headline case: bourbon at 38% FAILs even though it may match its application', () => {
  const v = checkStandardOfIdentity('Kentucky Straight Bourbon Whiskey', 38);
  assert.equal(v.verdict, 'FAIL');
  assert.match(v.reason, /below the minimum bottling strength/i);
  assert.match(v.reason, /even if it matches/i);
  assert.ok(v.citation);
});

test('bourbon at or above 40% passes', () => {
  assert.equal(checkStandardOfIdentity('Kentucky Straight Bourbon Whiskey', 45).verdict, 'PASS');
  assert.equal(checkStandardOfIdentity('Bourbon Whiskey', 40).verdict, 'PASS');
});

test('a spirit meeting no standard of identity is flagged as a § 5.156 specialty product', () => {
  const v = checkStandardOfIdentity('Aquavit', 42);
  assert.equal(v.verdict, 'FLAG');
  assert.match(v.reason, /specialty product/i);
  assert.match(v.citation!.section, /5\.156/);
});

test('unreadable ABV on a known designation FLAGs rather than passing', () => {
  assert.equal(checkStandardOfIdentity('Vodka', null).verdict, 'FLAG');
});

// ---- Wine (27 CFR Part 4) — now evaluated, not just "not evaluated" ----

test('table wine over 14% ABV FAILs (§ 4.21(a)(5)), even matching its application', () => {
  const v = checkStandardOfIdentity('Table Wine', 16);
  assert.equal(v.verdict, 'FAIL');
  assert.match(v.reason, /14%\s*maximum/i);
  assert.match(v.citation!.section, /4\.21/);
});

test('table wine at or under 14% passes', () => {
  assert.equal(checkStandardOfIdentity('Table Wine', 12).verdict, 'PASS');
  assert.equal(checkStandardOfIdentity('Table Wine', 14).verdict, 'PASS');
});

test('dessert wine below its 14% floor FAILs; within range passes', () => {
  assert.equal(checkStandardOfIdentity('Dessert Wine', 12).verdict, 'FAIL');
  assert.equal(checkStandardOfIdentity('Dessert Wine', 20).verdict, 'PASS');
});

test('sherry carries a 17% floor; port an 18% floor', () => {
  assert.equal(checkStandardOfIdentity('Cream Sherry', 15).verdict, 'FAIL');
  assert.equal(checkStandardOfIdentity('Cream Sherry', 18).verdict, 'PASS');
  assert.equal(checkStandardOfIdentity('Tawny Port', 17).verdict, 'FAIL');
  assert.equal(checkStandardOfIdentity('Tawny Port', 19).verdict, 'PASS');
});

test('aperitif wine / vermouth carry a 15% floor (§ 4.21(g))', () => {
  assert.equal(checkStandardOfIdentity('Sweet Vermouth', 12).verdict, 'FAIL');
  assert.equal(checkStandardOfIdentity('Sweet Vermouth', 16).verdict, 'PASS');
});

test('a varietal wine with no specific type is checked against the § 4.6 envelope', () => {
  // 7–24% is the whole-of-Part-4 scope; a normal varietal complies…
  assert.equal(checkStandardOfIdentity('Cabernet Sauvignon', 13.5).verdict, 'PASS');
  assert.equal(checkStandardOfIdentity('Syrah', 14).verdict, 'PASS');
  // …a "wine" over 24% cannot be a Part 4 wine at all → FAIL (it's a spirit)…
  const over = checkStandardOfIdentity('Cabernet Sauvignon', 30);
  assert.equal(over.verdict, 'FAIL');
  assert.match(over.citation!.section, /4\.6/);
  // …and below 7% it's out of Part 4 scope (FDA product) → FLAG, not FAIL.
  const under = checkStandardOfIdentity('Cabernet Sauvignon', 5);
  assert.equal(under.verdict, 'FLAG');
});

test('non-grape Part 4 wines (cider, perry, sake, mead) are evaluated as wine, not misrouted to spirits', () => {
  // Detected as wine and cited to Part 4 — never the old spirits fallback.
  for (const ct of ['Hard Cider', 'Perry', 'Sake', 'Mead', 'Honey Wine']) {
    const v = checkStandardOfIdentity(ct, 15);
    assert.equal(v.verdict, 'PASS', `${ct} at 15% is within the wine envelope`);
    assert.match(v.citation!.section, /\b4\./, `${ct} should cite Part 4, not Part 5`);
  }
  // A typical ~5% hard cider is below the 7% wine floor → FLAG (FDA product).
  assert.equal(checkStandardOfIdentity('Hard Cider', 5).verdict, 'FLAG');
});

// ---- Malt (27 CFR Part 7) — evaluated by designation recognition, not ABV ----

test('whole-word matching: "Ginjo" sake is wine (not gin); "Porter" is malt (not port)', () => {
  // Regression: "Junmai Ginjo Sake" used to match the spirit "gin" (40% floor)
  // via partial-word matching → a false FAIL. It is a wine.
  const sake = checkStandardOfIdentity('Junmai Ginjo Sake', 15.5);
  assert.equal(sake.verdict, 'PASS');
  assert.match(sake.citation!.section, /\b4\./); // Part 4 wine, not § 5.144 gin
  // "Porter" must be the malt beverage, not wine "port".
  const porter = checkStandardOfIdentity('Robust Porter', 6);
  assert.equal(porter.verdict, 'PASS');
  assert.match(porter.citation!.section, /7\.63/);
});

test('"Orange Muscat" is recognized as wine (§ 4.6 envelope), not "type undetermined"', () => {
  const v = checkStandardOfIdentity('Orange Muscat', 13.68);
  assert.equal(v.verdict, 'PASS');
  assert.match(v.citation!.section, /\b4\./);
});

test('a recognized malt designation PASSes (§ 7.63); malt has no ABV threshold', () => {
  const v = checkStandardOfIdentity('Imperial Stout', 8);
  assert.equal(v.verdict, 'PASS');
  assert.match(v.reason, /recognized malt-beverage/i);
  assert.match(v.reason, /no bottling-\s*strength standard/i);
});

test('malt evaluation is ABV-independent — a strong ale does not "fail" on strength', () => {
  // No FAIL path for malt: with no min/max, high ABV is not a violation.
  assert.equal(checkStandardOfIdentity('Malt Liquor', 12).verdict, 'PASS');
  assert.equal(checkStandardOfIdentity('Lager', null).verdict, 'PASS');
});

// ---- Spirits: flavored (§ 5.151), cordials/liqueurs (§ 5.150), imitations (§ 5.152) ----

test('flavored spirits carry a 30% floor, NOT the base spirit’s 40% (§ 5.151)', () => {
  // The false-fail this prevents: a compliant 35% flavored whisky held to 40%.
  const ok = checkStandardOfIdentity('Cherry Flavored Bourbon Whiskey', 35);
  assert.equal(ok.verdict, 'PASS');
  assert.match(ok.citation!.section, /5\.151/);
  assert.equal(checkStandardOfIdentity('Pineapple Flavored Tequila', 28).verdict, 'FAIL'); // below 30
});

test('"flavored malt beverage" is NOT treated as a flavored spirit', () => {
  const v = checkStandardOfIdentity('Flavored Malt Beverage', 5);
  assert.equal(v.verdict, 'PASS');
  assert.match(v.citation!.section, /7\.63/); // malt path, not § 5.151
});

test('cordials/liqueurs have no minimum bottling strength (§ 5.150); sloe gin is not gin', () => {
  assert.equal(checkStandardOfIdentity('Amaretto', 24).verdict, 'PASS'); // no floor
  assert.equal(checkStandardOfIdentity('Elderflower Cordial Liqueur', 20).verdict, 'PASS');
  // "Sloe gin" is a liqueur — must NOT be failed against gin's 40%.
  assert.equal(checkStandardOfIdentity('Sloe Gin', 30).verdict, 'PASS');
});

test('named liqueur types carry their own floors (§ 5.150(b))', () => {
  assert.equal(checkStandardOfIdentity('Rye Liqueur', 28).verdict, 'FAIL'); // < 30
  assert.equal(checkStandardOfIdentity('Rye Liqueur', 32).verdict, 'PASS');
  assert.equal(checkStandardOfIdentity('Rock and Rye', 22).verdict, 'FAIL'); // < 24
  assert.equal(checkStandardOfIdentity('Rock and Rye', 26).verdict, 'PASS');
});

test('imitations are recognized with no floor (§ 5.152)', () => {
  const v = checkStandardOfIdentity('Imitation Whisky', 30);
  assert.equal(v.verdict, 'PASS');
  assert.match(v.citation!.section, /5\.152/);
});

test('newly-covered base spirits carry the 40% minimum with correct citations', () => {
  for (const [ct, section] of [
    ['Cognac', '5.145'],
    ['Armagnac', '5.145'],
    ['Grappa', '5.145'],
    ['Agave Spirits', '5.148'],
    ['Neutral Spirits', '5.142'],
    ['Cachaça', '5.147'],
  ] as const) {
    assert.equal(checkStandardOfIdentity(ct, 38).verdict, 'FAIL', `${ct} at 38% is under 40%`);
    const ok = checkStandardOfIdentity(ct, 40);
    assert.equal(ok.verdict, 'PASS', `${ct} at 40% passes`);
    assert.match(ok.citation!.section, new RegExp(section.replace('.', '\\.')));
  }
});
