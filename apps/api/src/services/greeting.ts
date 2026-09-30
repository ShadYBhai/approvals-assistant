import type { LlmClient } from '../app';
import { greetingPrompt } from '../prompts/greeting.v1';
import { greetingFallback } from './fallback';
import { LlmError } from './llm';
import fixture from '../data/approvals.fixture.json';
import type { Approval } from '@approvals/contracts';

export async function* streamGreeting(
  llm: LlmClient,
  language: string,
  signal: AbortSignal,
): AsyncGenerator<{ type: 'token'; text: string } | { type: 'done'; source: 'ai' | 'fallback'; promptVersion: string }> {
  try {
    for await (const token of llm.stream(
      {
        system: greetingPrompt.system,
        user: greetingPrompt.buildUser(fixture as Approval[], language),
        promptVersion: greetingPrompt.version,
        feature: 'greeting',
      },
      { signal },
    )) {
      yield { type: 'token', text: token };
    }
    yield { type: 'done', source: 'ai', promptVersion: greetingPrompt.version };
  } catch (err) {
    if (err instanceof LlmError) {
      console.warn(`[greeting] LLM error ${err.code}: ${err.message}`);
    } else {
      console.warn('[greeting] unexpected error:', err);
    }
    const fb = greetingFallback();
    yield { type: 'token', text: fb.text };
    yield { type: 'done', source: 'fallback', promptVersion: fb.promptVersion };
  }
}
