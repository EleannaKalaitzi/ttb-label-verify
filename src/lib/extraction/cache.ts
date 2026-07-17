import { createHash } from 'node:crypto';
import type { ExtractionProvider, ExtractionInput, ExtractionResult } from './provider';
import type { Extraction } from './schema';

/**
 * Content-hash extraction cache.
 *
 * The key is a hash of (image bytes + a namespace identifying model + prompt
 * version). So:
 *   - re-checking the exact same label is instant (no model call);
 *   - identical labels inside a 300-label batch cost ONE call, not many;
 *   - changing the model or the prompt changes the namespace, which
 *     invalidates every entry automatically — no stale results.
 *
 * In-memory only. Nothing is persisted (no PII stored server-side). On Railway's
 * persistent container the map survives across requests; a restart simply warms
 * cold again. Only SUCCESSFUL extractions are cached — a timeout or parse
 * failure is never remembered, so it retries next time rather than sticking.
 */

/** Soft cap on entries; oldest are evicted first (Map preserves insert order).
 *  Generous for a prototype — a batch of a few hundred labels fits easily. */
const MAX_ENTRIES = 5000;

export function contentHash(imageBase64: string, namespace: string): string {
  return createHash('sha256')
    .update(namespace)
    .update('\0')
    .update(imageBase64)
    .digest('hex');
}

interface CachedEntry {
  data: Extraction;
  source: ExtractionResult['source'];
}

export class CachingProvider implements ExtractionProvider {
  private store = new Map<string, CachedEntry>();

  /**
   * @param inner     the real provider to fall back to on a miss
   * @param namespace identifies the model + prompt version, so a change to
   *                  either invalidates the cache (e.g. "claude-haiku-4-5:v1")
   */
  constructor(
    private inner: ExtractionProvider,
    private namespace: string,
  ) {}

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    const start = performance.now();
    const key = contentHash(input.imageBase64, this.namespace);

    const hit = this.store.get(key);
    if (hit) {
      return {
        data: hit.data,
        latencyMs: performance.now() - start, // ~0; the whole point
        source: hit.source,
        cached: true,
      };
    }

    const result = await this.inner.extract(input);
    // Only remember successful extractions.
    if (result.data != null) {
      this.evictIfFull();
      this.store.set(key, { data: result.data, source: result.source });
    }
    return { ...result, cached: false };
  }

  private evictIfFull() {
    if (this.store.size < MAX_ENTRIES) return;
    const oldest = this.store.keys().next().value;
    if (oldest !== undefined) this.store.delete(oldest);
  }

  /** Test/ops helper. */
  size() {
    return this.store.size;
  }
}
