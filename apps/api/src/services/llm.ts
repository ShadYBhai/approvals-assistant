import Anthropic from '@anthropic-ai/sdk';
import type { LlmClient, LlmJsonRequest, LlmTextRequest } from '../app';

export type LlmErrorCode = 'timeout' | 'api_error' | 'malformed' | 'no_key' | 'network';

export class LlmError extends Error {
  constructor(
    public readonly code: LlmErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

function checkSimulate(): void {
  const simulate = process.env.LLM_SIMULATE;
  if (simulate === 'timeout') throw new LlmError('timeout', 'Simulated timeout');
  if (simulate === 'error') throw new LlmError('api_error', 'Simulated API error');
  if (simulate === 'malformed') throw new LlmError('malformed', 'Simulated malformed response');
}

function isTransient(err: unknown): boolean {
  if (err instanceof Anthropic.APIError) {
    const s = err.status ?? 0;
    return s === 429 || (s >= 500 && s < 600);
  }
  // Network-level errors (no status code)
  if (err instanceof Error && err.message.includes('fetch')) return true;
  return false;
}

export function createLlmClient(): LlmClient {
  return {
    async completeJson(req: LlmJsonRequest, opts: { signal: AbortSignal }) {
      checkSimulate();

      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) throw new LlmError('no_key', 'ANTHROPIC_API_KEY is not set');

      const model = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001';
      const client = new Anthropic({ apiKey: key });

      const attempt = async () => {
        const timeoutMs = 8000;
        const controller = new AbortController();
        // Respect the caller's signal too
        opts.signal.addEventListener('abort', () => controller.abort());
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const response = await client.messages.create(
            {
              model,
              max_tokens: 1024,
              system: req.system,
              messages: [{ role: 'user', content: req.user }],
              tools: [
                {
                  name: req.toolName,
                  description: `Return structured ${req.toolName} data`,
                  input_schema: req.toolSchema as Anthropic.Tool['input_schema'],
                },
              ],
              tool_choice: { type: 'tool', name: req.toolName },
            },
            { signal: controller.signal },
          );

          const toolBlock = response.content.find((b) => b.type === 'tool_use');
          if (!toolBlock || toolBlock.type !== 'tool_use') {
            throw new LlmError('malformed', 'No tool_use block in response');
          }
          return toolBlock.input;
        } catch (err) {
          if ((err as Error).name === 'AbortError') {
            throw new LlmError('timeout', 'Request timed out after 8s');
          }
          throw err;
        } finally {
          clearTimeout(timer);
        }
      };

      try {
        return await attempt();
      } catch (err) {
        // Retry once for transient errors — never retry timeouts (would double the wait)
        if (isTransient(err) && !(err instanceof LlmError && err.code === 'timeout')) {
          return await attempt();
        }
        if (err instanceof LlmError) throw err;
        throw new LlmError('api_error', (err as Error).message);
      }
    },

    async *stream(req: LlmTextRequest, opts: { signal: AbortSignal }) {
      checkSimulate();

      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) throw new LlmError('no_key', 'ANTHROPIC_API_KEY is not set');

      const model = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001';
      const client = new Anthropic({ apiKey: key });

      const controller = new AbortController();
      opts.signal.addEventListener('abort', () => controller.abort());

      // 8s timeout to first token
      let firstToken = false;
      const firstTokenTimer = setTimeout(() => {
        if (!firstToken) controller.abort();
      }, 8000);

      try {
        const stream = client.messages.stream(
          {
            model,
            max_tokens: req.maxTokens ?? 1024,
            system: req.system,
            messages: [{ role: 'user', content: req.user }],
          },
          { signal: controller.signal },
        );

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            if (!firstToken) {
              firstToken = true;
              clearTimeout(firstTokenTimer);
            }
            yield event.delta.text;
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          throw new LlmError('timeout', 'Stream timed out');
        }
        if (err instanceof LlmError) throw err;
        throw new LlmError('api_error', (err as Error).message);
      } finally {
        clearTimeout(firstTokenTimer);
      }
    },
  };
}
