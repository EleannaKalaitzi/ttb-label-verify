import type { Extraction } from './schema';

/**
 * The LLM seam. Everything upstream of the model talks to this interface and
 * nothing else — so swapping Haiku for an Azure-hosted or on-prem model (the
 * TTB firewall story) is a one-file change. This is deliberately the ONLY place
 * that knows a network model exists.
 */

export interface ExtractionInput {
  /** Raw image bytes, base64-encoded (no data: prefix). */
  imageBase64: string;
  /** MIME type, e.g. "image/png" or "image/jpeg". */
  mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
}

/** Outcome of a single extraction attempt. `data` is null only when the model
 *  could not be coerced into the schema after a retry — the caller maps that to
 *  NEEDS_REVIEW, never to an error page. */
export interface ExtractionResult {
  data: Extraction | null;
  /** Wall-clock time for the model call(s), in milliseconds. Measured, not
   *  asserted — this is the number the 5s requirement is judged against. */
  latencyMs: number;
  /** How the result was produced, for logging and the measurement harness. */
  source: 'anthropic' | 'mock';
  /** True when served from the content-hash cache (no model call was made). */
  cached?: boolean;
  /** Token usage when available (real provider only). */
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens: number;
    cacheCreationInputTokens: number;
  };
  /** Present when data is null: why extraction failed. */
  error?: string;
}

export interface ExtractionProvider {
  extract(input: ExtractionInput): Promise<ExtractionResult>;
}

/**
 * Selects the provider. Mock mode (MOCK_EXTRACTION=1) serves canned extractions
 * with no network call and no API key — a reviewer must be able to clone,
 * install, and see the app work before touching a key.
 *
 * The real provider is imported lazily so mock mode never pulls in the SDK or
 * requires a key to be present.
 */
export async function getExtractionProvider(): Promise<ExtractionProvider> {
  const { PROMPT_VERSION } = await import('./prompt');
  const { CachingProvider } = await import('./cache');

  if (process.env.MOCK_EXTRACTION === '1') {
    const { MockProvider } = await import('./mock');
    return new CachingProvider(new MockProvider(), `mock:${PROMPT_VERSION}`);
  }
  const { AnthropicProvider, MODEL } = await import('./anthropic');
  return new CachingProvider(new AnthropicProvider(), `${MODEL}:${PROMPT_VERSION}`);
}
