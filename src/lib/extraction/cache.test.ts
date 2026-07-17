import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CachingProvider, contentHash } from './cache';
import type { ExtractionProvider, ExtractionInput, ExtractionResult } from './provider';
import type { Extraction } from './schema';

const sample: Extraction = {
  brand_name: 'X',
  class_type: 'Vodka',
  alcohol_content: { abv_percent: 40, proof: null },
  government_warning: {
    present: true,
    text: null,
    first_two_words_all_caps: null,
    first_two_words_bold: null,
    remainder_bold: null,
    is_continuous: null,
  },
};

/** A provider that counts how many times it was actually called. */
class CountingProvider implements ExtractionProvider {
  calls = 0;
  constructor(private result: ExtractionResult) {}
  async extract(): Promise<ExtractionResult> {
    this.calls++;
    return this.result;
  }
}

const img = (data: string): ExtractionInput => ({ imageBase64: data, mediaType: 'image/png' });

test('identical input hits the cache — inner provider is called once', async () => {
  const inner = new CountingProvider({ data: sample, latencyMs: 500, source: 'anthropic' });
  const cache = new CachingProvider(inner, 'test:v1');

  const first = await cache.extract(img('AAAA'));
  const second = await cache.extract(img('AAAA'));

  assert.equal(inner.calls, 1); // second served from cache
  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.deepEqual(second.data, sample);
});

test('different image misses the cache', async () => {
  const inner = new CountingProvider({ data: sample, latencyMs: 500, source: 'anthropic' });
  const cache = new CachingProvider(inner, 'test:v1');
  await cache.extract(img('AAAA'));
  await cache.extract(img('BBBB'));
  assert.equal(inner.calls, 2);
});

test('failed extractions are NOT cached (so they retry)', async () => {
  const inner = new CountingProvider({ data: null, latencyMs: 20, source: 'anthropic', error: 'timeout' });
  const cache = new CachingProvider(inner, 'test:v1');
  await cache.extract(img('AAAA'));
  await cache.extract(img('AAAA'));
  assert.equal(inner.calls, 2); // retried, not served a cached failure
});

test('changing the namespace (model/prompt version) invalidates the key', () => {
  assert.notEqual(contentHash('AAAA', 'haiku:v1'), contentHash('AAAA', 'haiku:v2'));
  assert.notEqual(contentHash('AAAA', 'haiku:v1'), contentHash('AAAA', 'sonnet:v1'));
  assert.equal(contentHash('AAAA', 'haiku:v1'), contentHash('AAAA', 'haiku:v1'));
});
