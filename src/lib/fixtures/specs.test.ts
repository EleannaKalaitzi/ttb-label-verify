import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIXTURES, deriveExtraction } from './specs';
import { verify } from '../verify/verify';

/**
 * The fixture set is the measurement corpus: every labelled fixture, run through
 * the real decision engine, must produce its stated expected verdict. This is
 * what lets accuracy be reported rather than asserted — and it catches any drift
 * between a fixture's design and the engine's behaviour.
 */
for (const spec of FIXTURES) {
  test(`fixture ${spec.id}: ${spec.title} → ${spec.expectedOverall}`, () => {
    const result = verify(deriveExtraction(spec), spec.declared);
    assert.equal(result.overall, spec.expectedOverall, `${spec.id}: ${spec.expectedNote}`);
  });
}

test('fixture ids are unique', () => {
  const ids = FIXTURES.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
});
