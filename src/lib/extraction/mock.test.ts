import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MockProvider } from './mock';

const provider = new MockProvider();

function b64(path: string): string {
  return readFileSync(join(process.cwd(), path)).toString('base64');
}

test('unknown image falls back to a clean, compliant label (default PASS path)', async () => {
  const res = await provider.extract({ imageBase64: 'bm90LWEtZml4dHVyZQ==', mediaType: 'image/png' });
  assert.equal(res.source, 'mock');
  assert.equal(res.data?.brand_name, "STONE'S THROW");
  assert.equal(res.data?.alcohol_content.abv_percent, 45);
  assert.equal(res.data?.government_warning.remainder_bold, false);
});

test('a known fixture image returns THAT fixture reading (bourbon-38 → 38% ABV)', async () => {
  const res = await provider.extract({ imageBase64: b64('images/05-bourbon-38.png'), mediaType: 'image/png' });
  assert.equal(res.data?.alcohol_content.abv_percent, 38);
});

test('the fully-bold fixture reads remainder_bold = true', async () => {
  const res = await provider.extract({ imageBase64: b64('images/03-warning-fully-bold.png'), mediaType: 'image/png' });
  assert.equal(res.data?.government_warning.remainder_bold, true);
});

test('the missing-warning fixture reads present = false', async () => {
  const res = await provider.extract({ imageBase64: b64('images/04-warning-missing.png'), mediaType: 'image/png' });
  assert.equal(res.data?.government_warning.present, false);
});

test('mock reports a latency and never throws on empty input', async () => {
  const res = await provider.extract({ imageBase64: '', mediaType: 'image/png' });
  assert.ok(res.latencyMs >= 0);
  assert.ok(res.data);
});
