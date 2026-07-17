import { test } from 'node:test';
import assert from 'node:assert/strict';
import type Anthropic from '@anthropic-ai/sdk';
import { AnthropicProvider } from './anthropic';
import type { Extraction } from './schema';

const SAMPLE: Extraction = {
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

/** Build a provider whose SDK client is a stub returning `parse` behaviour. */
function providerWith(parse: () => Promise<unknown> | never) {
  const client = { messages: { parse } } as unknown as Anthropic;
  return new AnthropicProvider(client);
}

test('maps a successful parse to data + usage + latency', async () => {
  const provider = providerWith(async () => ({
    parsed_output: SAMPLE,
    usage: {
      input_tokens: 1200,
      output_tokens: 80,
      cache_read_input_tokens: 1000,
      cache_creation_input_tokens: 0,
    },
  }));
  const res = await provider.extract({ imageBase64: 'AAA', mediaType: 'image/png' });
  assert.equal(res.source, 'anthropic');
  assert.deepEqual(res.data, SAMPLE);
  assert.equal(res.usage?.inputTokens, 1200);
  assert.equal(res.usage?.cacheReadInputTokens, 1000);
  assert.ok(res.latencyMs >= 0);
  assert.equal(res.cached ?? false, false);
});

test('null parsed_output → data null + schema-validation error (NEEDS_REVIEW)', async () => {
  const provider = providerWith(async () => ({
    parsed_output: null,
    usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
  }));
  const res = await provider.extract({ imageBase64: 'AAA', mediaType: 'image/png' });
  assert.equal(res.data, null);
  assert.equal(res.error, 'model_output_failed_schema_validation');
});

test('a thrown error (timeout/transport) returns data null with the message, never crashes', async () => {
  const provider = providerWith(async () => {
    throw new Error('Request timed out');
  });
  const res = await provider.extract({ imageBase64: 'AAA', mediaType: 'image/png' });
  assert.equal(res.data, null);
  assert.match(res.error ?? '', /timed out/i);
});

test('missing cache usage fields default to 0', async () => {
  const provider = providerWith(async () => ({
    parsed_output: SAMPLE,
    usage: { input_tokens: 5, output_tokens: 5 }, // no cache_* fields
  }));
  const res = await provider.extract({ imageBase64: 'AAA', mediaType: 'image/png' });
  assert.equal(res.usage?.cacheReadInputTokens, 0);
  assert.equal(res.usage?.cacheCreationInputTokens, 0);
});
