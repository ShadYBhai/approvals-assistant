import { createLlmClient, LlmError } from '../services/llm';

describe('createLlmClient — simulation mode', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws LlmError with code "timeout" when LLM_SIMULATE=timeout', async () => {
    process.env.LLM_SIMULATE = 'timeout';
    const llm = createLlmClient();
    const signal = new AbortController().signal;
    await expect(
      llm.completeJson(
        { system: 's', user: 'u', toolName: 't', toolSchema: {}, promptVersion: 'v1', feature: 'test' },
        { signal },
      ),
    ).rejects.toMatchObject({ code: 'timeout' });
  });

  it('throws LlmError with code "api_error" when LLM_SIMULATE=error', async () => {
    process.env.LLM_SIMULATE = 'error';
    const llm = createLlmClient();
    const signal = new AbortController().signal;
    await expect(
      llm.completeJson(
        { system: 's', user: 'u', toolName: 't', toolSchema: {}, promptVersion: 'v1', feature: 'test' },
        { signal },
      ),
    ).rejects.toMatchObject({ code: 'api_error' });
  });

  it('throws LlmError with code "malformed" when LLM_SIMULATE=malformed', async () => {
    process.env.LLM_SIMULATE = 'malformed';
    const llm = createLlmClient();
    const signal = new AbortController().signal;
    await expect(
      llm.completeJson(
        { system: 's', user: 'u', toolName: 't', toolSchema: {}, promptVersion: 'v1', feature: 'test' },
        { signal },
      ),
    ).rejects.toMatchObject({ code: 'malformed' });
  });

  it('stream simulation yields tokens then throws on LLM_SIMULATE=error', async () => {
    process.env.LLM_SIMULATE = 'error';
    const llm = createLlmClient();
    const signal = new AbortController().signal;
    await expect(async () => {
      for await (const _token of llm.stream(
        { system: 's', user: 'u', promptVersion: 'v1', feature: 'test' },
        { signal },
      )) { /* consume */ }
    }).rejects.toMatchObject({ code: 'api_error' });
  });
});

describe('createLlmClient — missing API key', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ANTHROPIC_API_KEY: '' };
    delete process.env.LLM_SIMULATE;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws LlmError with code "no_key" when ANTHROPIC_API_KEY is missing', async () => {
    const llm = createLlmClient();
    const signal = new AbortController().signal;
    await expect(
      llm.completeJson(
        { system: 's', user: 'u', toolName: 't', toolSchema: {}, promptVersion: 'v1', feature: 'test' },
        { signal },
      ),
    ).rejects.toMatchObject({ code: 'no_key' });
  });
});

describe('LlmError', () => {
  it('is an instance of Error', () => {
    const err = new LlmError('timeout', 'timed out');
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('timeout');
    expect(err.message).toBe('timed out');
  });
});
