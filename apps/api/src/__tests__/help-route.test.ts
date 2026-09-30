import request from 'supertest';
import { createApp, LlmClient } from '../app';

function makeLlm(override?: Partial<LlmClient>): LlmClient {
  return {
    completeJson: jest.fn().mockResolvedValue({}),
    stream: async function* () { yield 'Policy chunk answer'; },
    ...override,
  };
}

describe('POST /api/assistant/help', () => {
  it('returns 400 when question is missing', async () => {
    const app = createApp({ llm: makeLlm() });
    const res = await request(app).post('/api/assistant/help').send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when question is empty string', async () => {
    const app = createApp({ llm: makeLlm() });
    const res = await request(app)
      .post('/api/assistant/help')
      .set('X-Session-Id', 'test-session')
      .send({ question: '' });
    expect(res.status).toBe(400);
  });

  it('streams done event with source on a valid question', async () => {
    const app = createApp({ llm: makeLlm(), timeoutMs: 5000 });
    const res = await request(app)
      .post('/api/assistant/help')
      .set('X-Session-Id', 'test-session')
      .send({ question: 'what do I check for safety equipment?' })
      .buffer(true)
      .parse((res, cb) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => cb(null, data));
      });

    expect(res.status).toBe(200);
    expect(res.text).toContain('event: done');
  });

  it('returns source: fallback when question matches no policy chunks', async () => {
    const app = createApp({ llm: makeLlm(), timeoutMs: 5000 });
    const res = await request(app)
      .post('/api/assistant/help')
      .set('X-Session-Id', 'test-session')
      .send({ question: 'what is the weather in Tokyo today' })
      .buffer(true)
      .parse((res, cb) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => cb(null, data));
      });

    expect(res.status).toBe(200);
    expect(res.text).toContain('"source":"fallback"');
  });

  it('returns source: fallback when LLM times out', async () => {
    const hangingLlm = makeLlm({
      stream: async function* (_req, opts) {
        await new Promise<void>((_, reject) => {
          opts.signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('AbortError'), { name: 'AbortError' })),
          );
        });
        yield '';
      },
    });
    const app = createApp({ llm: hangingLlm, timeoutMs: 80 });
    const res = await request(app)
      .post('/api/assistant/help')
      .set('X-Session-Id', 'test-session')
      .send({ question: 'what do I check for safety equipment?' })
      .buffer(true)
      .parse((res, cb) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => cb(null, data));
      });

    expect(res.status).toBe(200);
    expect(res.text).toContain('"source":"fallback"');
  });
});
