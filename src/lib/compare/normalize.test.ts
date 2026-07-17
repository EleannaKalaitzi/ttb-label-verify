import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, cosmeticallyEqual, similarity } from './normalize';

test('normalize collapses case, punctuation, and spacing', () => {
  assert.equal(normalize("STONE'S THROW"), 'stones throw');
  assert.equal(normalize('Stone’s Throw'), 'stones throw'); // curly apostrophe
  assert.equal(normalize('  Stones   Throw  '), 'stones throw');
});

test('normalize strips accents', () => {
  assert.equal(normalize('Café Rouge'), 'cafe rouge');
});

test('cosmeticallyEqual treats the reported real-world case as equal', () => {
  assert.ok(cosmeticallyEqual("STONE'S THROW", "Stone's Throw"));
  assert.ok(cosmeticallyEqual('Stones Throw', "Stone's Throw"));
});

test('cosmeticallyEqual is false for genuinely different text', () => {
  assert.ok(!cosmeticallyEqual('Stonewall', "Stone's Throw"));
});

test('similarity is 1 for cosmetically-equal, high for near, low for different', () => {
  assert.equal(similarity("STONE'S THROW", "Stone's Throw"), 1);
  assert.ok(similarity('Stone Throw', "Stone's Throw") > 0.8); // one-word diff -> near
  assert.ok(similarity('Stonewall', "Stone's Throw") < 0.5); // clearly different
});
