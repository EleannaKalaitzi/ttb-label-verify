import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareClassType } from './classtype';

test('cosmetic-only difference PASSes', () => {
  assert.equal(compareClassType('Kentucky Straight Bourbon Whiskey', 'KENTUCKY STRAIGHT BOURBON WHISKEY').verdict, 'PASS');
});

test('unreadable or missing class/type FLAGs', () => {
  assert.equal(compareClassType('Vodka', null).verdict, 'FLAG');
  assert.equal(compareClassType(null, 'Vodka').verdict, 'FLAG');
});

test('clearly different class/type FAILs', () => {
  assert.equal(compareClassType('Vodka', 'Kentucky Straight Bourbon Whiskey').verdict, 'FAIL');
});

test('a near variant FLAGs for a human', () => {
  assert.equal(compareClassType('Blended Scotch Whisky', 'Blended Scotch Whiskey').verdict, 'FLAG');
});
