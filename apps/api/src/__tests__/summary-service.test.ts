import { buildSummaryData } from '../services/summary';
import { LlmClient } from '../app';
import { LlmError } from '../services/llm';

const signal = new AbortController().signal;

const validLlmOutput = {
  headline: '4 approvals need your attention',
  priorities: [
    { itemId: 'a3', urgency: 'high', reason: 'Safety-related document' },
    { itemId: 'a1', urgency: 'medium', reason: 'Onboarding folder' },
    { itemId: 'a2', urgency: 'medium', reason: 'Video demo' },
    { itemId: 'a4', urgency: 'low', reason: 'Layout map' },
  ],
  narrative: 'You have 4 pending approvals. Safety Equipment specs should be reviewed first.',
};

function makeLlm(output: unknown): LlmClient {
  return {
    completeJson: async () => output,
    stream: async function* () { yield ''; },
  };
}

function makeThrowingLlm(err: Error): LlmClient {
  return {
    completeJson: async () => { throw err; },
    stream: async function* () { yield ''; },
  };
}

describe('buildSummaryData', () => {
  it('returns source:ai when LLM returns valid output', async () => {
    const result = await buildSummaryData(makeLlm(validLlmOutput), 'en', signal);
    expect(result.source).toBe('ai');
    expect(result.headline).toBe(validLlmOutput.headline);
    expect(result.priorities).toHaveLength(4);
  });

  it('returns source:fallback when LLM returns malformed (non-object)', async () => {
    const result = await buildSummaryData(makeLlm('not an object at all'), 'en', signal);
    expect(result.source).toBe('fallback');
  });

  it('returns source:fallback when LLM returns wrong shape (missing fields)', async () => {
    const result = await buildSummaryData(makeLlm({ foo: 'bar' }), 'en', signal);
    expect(result.source).toBe('fallback');
  });

  it('returns source:fallback when priorities contain unknown itemIds', async () => {
    const badOutput = {
      ...validLlmOutput,
      priorities: [{ itemId: 'z99', urgency: 'high', reason: 'unknown item' }],
    };
    const result = await buildSummaryData(makeLlm(badOutput), 'en', signal);
    expect(result.source).toBe('fallback');
  });

  it('returns source:fallback when LLM throws LlmError (timeout)', async () => {
    const result = await buildSummaryData(
      makeThrowingLlm(new LlmError('timeout', 'timed out')),
      'en',
      signal,
    );
    expect(result.source).toBe('fallback');
  });

  it('fallback has correct item count in headline', async () => {
    const result = await buildSummaryData(makeLlm('bad'), 'en', signal);
    expect(result.headline).toMatch(/4/);
  });
});
