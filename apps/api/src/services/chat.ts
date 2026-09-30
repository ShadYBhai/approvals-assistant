import type { ChatMessage } from '@approvals/contracts';
import type { LlmClient } from '../app';
import { chatPrompt } from '../prompts/chat.v1';
import { chatFallback } from './fallback';
import { LlmError } from './llm';
import fixture from '../data/approvals.fixture.json';

export async function* streamChat(
  llm: LlmClient,
  message: string,
  history: ChatMessage[],
  language: string,
  signal: AbortSignal,
): AsyncGenerator<{ type: 'token'; text: string } | { type: 'done'; source: 'ai' | 'fallback'; promptVersion: string }> {
  try {
    for await (const token of llm.stream(
      {
        system: chatPrompt.system,
        user: chatPrompt.buildUser(message, history, fixture as Parameters<typeof chatPrompt.buildUser>[2], language),
        promptVersion: chatPrompt.version,
        feature: 'chat',
      },
      { signal },
    )) {
      yield { type: 'token', text: token };
    }
    yield { type: 'done', source: 'ai', promptVersion: chatPrompt.version };
  } catch (err) {
    if (err instanceof LlmError) {
      console.warn(`[chat] LLM error ${err.code}: ${err.message}`);
    } else {
      console.warn('[chat] unexpected error:', err);
    }
    const fb = chatFallback();
    yield { type: 'token', text: fb.text };
    yield { type: 'done', source: 'fallback', promptVersion: fb.promptVersion };
  }
}
