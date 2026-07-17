/**
 * Extraction spike (PLAN.md Session 1a): one label -> schema'd JSON + latency.
 *
 * The point of this script is to answer the existential question early: does a
 * single extraction clear the 5-second budget, and does the model produce data
 * that fits our schema? It runs the exact same extraction path the app uses.
 *
 * Usage:
 *   MOCK_EXTRACTION=1 npm run spike                 # no key, canned data
 *   npm run spike -- ./path/to/label.png            # real model (needs key)
 *
 * With a real key, put ANTHROPIC_API_KEY in .env (tsx loads it automatically).
 */
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { getExtractionProvider } from '../src/lib/extraction/provider';
import type { ExtractionInput } from '../src/lib/extraction/provider';

const MEDIA_TYPES: Record<string, ExtractionInput['mediaType']> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

async function main() {
  const imagePath = process.argv[2];
  const mock = process.env.MOCK_EXTRACTION === '1';

  if (!mock && !imagePath) {
    console.error('Provide an image path, or set MOCK_EXTRACTION=1 for canned data.');
    process.exit(1);
  }

  let input: ExtractionInput;
  if (imagePath) {
    const ext = extname(imagePath).toLowerCase();
    const mediaType = MEDIA_TYPES[ext];
    if (!mediaType) {
      console.error(`Unsupported image type "${ext}". Use png/jpg/webp/gif.`);
      process.exit(1);
    }
    input = { imageBase64: readFileSync(imagePath).toString('base64'), mediaType };
  } else {
    // Mock mode ignores the image bytes entirely.
    input = { imageBase64: '', mediaType: 'image/png' };
  }

  console.log(`\nMode: ${mock ? 'MOCK (no network)' : 'REAL (Claude Haiku)'}`);
  if (imagePath) console.log(`Image: ${imagePath}`);

  const provider = await getExtractionProvider();
  const result = await provider.extract(input);

  console.log('\n--- Extraction ---');
  console.log(JSON.stringify(result.data, null, 2));

  console.log('\n--- Metrics ---');
  console.log(`source:     ${result.source}`);
  console.log(`latency:    ${result.latencyMs.toFixed(0)} ms`);
  console.log(`5s budget:  ${result.latencyMs <= 5000 ? 'PASS' : 'OVER'}`);
  if (result.usage) {
    console.log(
      `tokens:     in=${result.usage.inputTokens} out=${result.usage.outputTokens} ` +
        `cache_read=${result.usage.cacheReadInputTokens} cache_write=${result.usage.cacheCreationInputTokens}`,
    );
  }
  if (result.error) console.log(`error:      ${result.error}`);
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
