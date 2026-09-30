import type { ChatMessage } from '@approvals/contracts';
import type { LlmClient } from '../app';
import { teachPrompt } from '../prompts/teach.v1';
import { teachFallback } from './fallback';
import { LlmError } from './llm';

export async function* streamTeach(
  llm: LlmClient,
  message: string | undefined,
  history: ChatMessage[],
  language: string,
  signal: AbortSignal,
): AsyncGenerator<{ type: 'token'; text: string } | { type: 'done'; source: 'ai' | 'fallback'; promptVersion: string }> {
  try {
    for await (const token of llm.stream(
      {
        system: teachPrompt.system,
        user: teachPrompt.buildUser(message, history, language),
        promptVersion: teachPrompt.version,
        feature: 'teach',
      },
      { signal },
    )) {
      yield { type: 'token', text: token };
    }
    yield { type: 'done', source: 'ai', promptVersion: teachPrompt.version };
  } catch (err) {
    if (err instanceof LlmError) {
      console.warn(`[teach] LLM error ${err.code}: ${err.message}`);
    } else {
      console.warn('[teach] unexpected error:', err);
    }
    const fb = teachFallback();
    yield { type: 'token', text: fb.text };
    yield { type: 'done', source: 'fallback', promptVersion: fb.promptVersion };
  }
}
