import type { LlmClient } from '../app';
import { helpPrompt } from '../prompts/help.v1';
import { retrieve } from './retrieval';
import { helpFallback } from './fallback';
import { LlmError } from './llm';

export async function* streamHelp(
  llm: LlmClient,
  question: string,
  signal: AbortSignal,
): AsyncGenerator<{ type: 'token'; text: string } | { type: 'done'; source: 'ai' | 'fallback'; promptVersion: string; chunkIds: string[] }> {
  const chunks = retrieve(question);

  // No relevant policy chunks — answer deterministically, no LLM call
  if (chunks.length === 0) {
    const fb = helpFallback([]);
    yield { type: 'token', text: fb.text };
    yield { type: 'done', source: 'fallback', promptVersion: fb.promptVersion, chunkIds: [] };
    return;
  }

  const chunkIds = chunks.map((c) => c.id);

  try {
    for await (const token of llm.stream(
      {
        system: helpPrompt.system,
        user: helpPrompt.buildUser(question, chunks),
        promptVersion: helpPrompt.version,
        feature: 'help',
      },
      { signal },
    )) {
      yield { type: 'token', text: token };
    }
    yield { type: 'done', source: 'ai', promptVersion: helpPrompt.version, chunkIds };
  } catch (err) {
    if (err instanceof LlmError) {
      console.warn(`[help] LLM error ${err.code}: ${err.message}`);
    } else {
      console.warn('[help] unexpected error:', err);
    }
    const fb = helpFallback(chunks);
    yield { type: 'token', text: fb.text };
    yield { type: 'done', source: 'fallback', promptVersion: fb.promptVersion, chunkIds };
  }
}
