import type { ExtractionProvider, ExtractionInput, ExtractionResult } from './provider';
import { REQUIRED_WARNING_TEXT } from './prompt';

/**
 * Canned extraction served when MOCK_EXTRACTION=1 — no network, no API key.
 * Lets a reviewer clone, `npm install`, and see the whole app work end-to-end
 * before obtaining a key. Highest value-per-minute item in the plan.
 *
 * Returns a clean, compliant label so the default demo path is a PASS.
 * TODO(session-3): key the canned response off a fixture id passed via input,
 * so mock mode can also demonstrate the FAIL and FLAG paths deterministically.
 */
export class MockProvider implements ExtractionProvider {
  async extract(_input: ExtractionInput): Promise<ExtractionResult> {
    const start = performance.now();
    // Simulate a plausible sub-second model latency so the UI's timing display
    // has something realistic to show in mock mode.
    await new Promise((r) => setTimeout(r, 40));
    return {
      data: {
        brand_name: "STONE'S THROW",
        class_type: 'Kentucky Straight Bourbon Whiskey',
        alcohol_content: { abv_percent: 45, proof: 90 },
        government_warning: {
          present: true,
          text: REQUIRED_WARNING_TEXT,
          first_two_words_all_caps: true,
          first_two_words_bold: true,
          remainder_bold: false,
          is_continuous: true,
        },
      },
      latencyMs: performance.now() - start,
      source: 'mock',
    };
  }
}
