/**
 * Server startup hook (Next.js instrumentation). In live mode, fire one tiny
 * extraction to pre-compile the structured-output schema, so the FIRST real
 * request a reviewer makes isn't the ~8s cold call (the one-time schema
 * compilation). Best-effort and non-blocking — a failure here never stops the
 * server from starting, and mock mode skips it entirely.
 */

// 1×1 transparent PNG — just enough to trigger the schema compile.
const TINY_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.MOCK_EXTRACTION === '1' || !process.env.ANTHROPIC_API_KEY) return;

  try {
    const { getSharedExtractionProvider } = await import('./lib/extraction/provider');
    const provider = await getSharedExtractionProvider();
    await provider.extract({ imageBase64: TINY_PNG, mediaType: 'image/png' });
    // Success or schema-validation failure both compile the schema; either warms it.
  } catch {
    // Best-effort only — never block startup on a warmup failure.
  }
}
