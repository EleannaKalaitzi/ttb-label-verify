import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { ExtractionProvider, ExtractionInput, ExtractionResult } from './provider';
import { ExtractionSchema } from './schema';
import { SYSTEM_PROMPT, USER_INSTRUCTION } from './prompt';

/**
 * Real extraction via Claude Haiku 4.5 with vision + structured outputs.
 *
 * Why Haiku: tightly-schema'd transcription is exactly what it is suited to.
 * Escalate only on measured evidence (see the measurement harness), never on a
 * hunch.
 *
 * Design decisions enforced here (CLAUDE.md § model call requirements):
 *  - temperature 0        — identical input yields identical output, or the
 *                           measurement harness is meaningless.
 *  - structured outputs   — the response is validated against ExtractionSchema
 *                           at the API layer; the model retries itself on a
 *                           schema mismatch. No hand-rolled JSON parsing.
 *  - lean max_tokens      — values only; the schema is small.
 *  - prompt caching       — the fixed system prompt (incl. § 16.21 text) is
 *                           marked cacheable; it repeats up to ~300× per batch.
 *  - hard timeout         — a slow call returns NEEDS_REVIEW, never an error.
 *  - retry once on parse  — then give up and return null (→ NEEDS_REVIEW).
 */

export const MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 1024;
const TIMEOUT_MS = 20_000;

export class AnthropicProvider implements ExtractionProvider {
  private client: Anthropic;

  constructor(client?: Anthropic) {
    // Resolves ANTHROPIC_API_KEY (or an `ant auth login` profile) from the env.
    this.client = client ?? new Anthropic({ timeout: TIMEOUT_MS });
  }

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    const start = performance.now();
    try {
      const response = await this.callModel(input);
      const latencyMs = performance.now() - start;

      if (response.parsed_output == null) {
        return {
          data: null,
          latencyMs,
          source: 'anthropic',
          error: 'model_output_failed_schema_validation',
        };
      }

      return {
        data: response.parsed_output,
        latencyMs,
        source: 'anthropic',
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          cacheReadInputTokens: response.usage.cache_read_input_tokens ?? 0,
          cacheCreationInputTokens: response.usage.cache_creation_input_tokens ?? 0,
        },
      };
    } catch (err) {
      // A timeout or transport error is a review signal, not a crash. The SDK
      // already retries 429/5xx/connection errors; anything landing here is
      // terminal for this attempt.
      return {
        data: null,
        latencyMs: performance.now() - start,
        source: 'anthropic',
        error: err instanceof Error ? err.message : 'unknown_error',
      };
    }
  }

  private callModel(input: ExtractionInput) {
    return this.client.messages.parse({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          // Cache the fixed prefix. Silently no-ops if the prefix is below the
          // model's minimum cacheable size — verify with usage.cache_* in the
          // measurement pass and consolidate the prompt if it isn't caching.
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: input.mediaType,
                data: input.imageBase64,
              },
            },
            { type: 'text', text: USER_INSTRUCTION },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(ExtractionSchema) },
    });
  }
}
