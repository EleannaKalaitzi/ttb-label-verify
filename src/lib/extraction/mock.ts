import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ExtractionProvider, ExtractionInput, ExtractionResult } from './provider';
import type { Extraction } from './schema';
import { REQUIRED_WARNING_TEXT } from './prompt';
import { FIXTURE_EXTRACTIONS } from './fixtures.generated';
import { SAMPLE_READS } from '../samples/reads.generated';

// Real sample photos (public/samples/) mapped by content hash to their authored
// read, built lazily on first use so mock mode returns the right verdict for the
// sample batch without any generation step.
let sampleHashes: Record<string, Extraction> | null = null;
function sampleByHash(): Record<string, Extraction> {
  if (sampleHashes) return sampleHashes;
  sampleHashes = {};
  try {
    const dir = join(process.cwd(), 'public', 'samples');
    for (const name of readdirSync(dir)) {
      const ext = SAMPLE_READS[name];
      if (!ext) continue;
      const hash = createHash('sha256').update(readFileSync(join(dir, name))).digest('hex');
      sampleHashes[hash] = ext;
    }
  } catch {
    /* directory may be absent in some environments — fall through to default */
  }
  return sampleHashes;
}

/**
 * Canned extraction served when MOCK_EXTRACTION=1 — no network, no API key.
 * Lets a reviewer clone, `npm install`, and see the whole app work end-to-end
 * before obtaining a key.
 *
 * Fixture-aware: if the uploaded image is one of the generated fixture labels
 * (matched by content hash), it returns that label's "perfect read" — so
 * uploading the title-case / fully-bold / bourbon-38 fixtures shows their real
 * FAIL/FLAG verdicts with no key. Any other image falls back to a clean,
 * compliant label so the default path is a PASS.
 */

const DEFAULT_CLEAN: Extraction = {
  brand_name: "STONE'S THROW",
  class_type: 'Kentucky Straight Bourbon Whiskey',
  alcohol_content: { abv_percent: 45, proof: 90 },
  net_contents: '750 mL',
  producer_bottler: "Stone's Throw Distillery, Louisville, KY",
  country_of_origin: null,
  government_warning: {
    present: true,
    text: REQUIRED_WARNING_TEXT,
    first_two_words_all_caps: true,
    first_two_words_bold: true,
    remainder_bold: false,
    is_continuous: true,
  },
};

export class MockProvider implements ExtractionProvider {
  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    const start = performance.now();
    // Simulate a plausible sub-second model latency so the UI's timing display
    // has something realistic to show in mock mode.
    await new Promise((r) => setTimeout(r, 40));

    const hash = createHash('sha256').update(Buffer.from(input.imageBase64, 'base64')).digest('hex');
    const data = FIXTURE_EXTRACTIONS[hash] ?? sampleByHash()[hash] ?? DEFAULT_CLEAN;

    return {
      data,
      latencyMs: performance.now() - start,
      source: 'mock',
    };
  }
}
