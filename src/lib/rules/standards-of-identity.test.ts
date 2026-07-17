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

test('a designation not in the table is honestly "not evaluated" (FLAG), never guessed', () => {
  const v = checkStandardOfIdentity('Elderflower Cordial Liqueur', 20);
  assert.equal(v.verdict, 'FLAG');
  assert.match(v.reason, /not evaluated/i);
});

test('unreadable ABV on a known designation FLAGs rather than passing', () => {
  assert.equal(checkStandardOfIdentity('Vodka', null).verdict, 'FLAG');
});
