import request from 'supertest';
import { createApp, LlmClient } from '../app';

function makeLlm(override?: Partial<LlmClient>): LlmClient {
  return {
    completeJson: jest.fn().mockResolvedValue({}),
    stream: async function* () { yield 'Policy chunk answer'; },
    ...override,
  };
}

function parseSse(text: string) {
  return text
    .split('\n\n')
    .filter(Boolean)
    .map((block) => {
      const lines = block.trim().split('\n');
      const event = (lines.find((l) => l.startsWith('event: ')) ?? '').slice(7);
      const dataStr = (lines.find((l) => l.startsWith('data: ')) ?? '').slice(6);
      try { return { event, data: JSON.parse(dataStr) }; }
      catch { return { event, data: dataStr }; }
    });
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

  it('streams done event with source:ai on a matched question', async () => {
    const app = createApp({ llm: makeLlm(), timeoutMs: 5000 });
    const res = await request(app)
      .post('/api/assistant/help')
      .set('X-Session-Id', 'test-session')
      .send({ question: 'what do I check for safety equipment?' })
      .buffer(true)
      .parse((r, cb) => {
        let d = '';
        r.on('data', (c: Buffer) => { d += c.toString(); });
        r.on('end', () => cb(null, d));
      });

    expect(res.status).toBe(200);
    const events = parseSse(res.body as string);
    const doneEvent = events.find((e) => e.event === 'done');
    expect(doneEvent?.data.source).toBe('ai');
  });

  it('returns source:fallback when question matches no policy chunks', async () => {
    const app = createApp({ llm: makeLlm(), timeoutMs: 5000 });
    const res = await request(app)
      .post('/api/assistant/help')
      .set('X-Session-Id', 'test-session')
      .send({ question: 'what is the weather in Tokyo today' })
      .buffer(true)
      .parse((r, cb) => {
        let d = '';
        r.on('data', (c: Buffer) => { d += c.toString(); });
        r.on('end', () => cb(null, d));
      });

    expect(res.status).toBe(200);
    const events = parseSse(res.body as string);
    const doneEvent = events.find((e) => e.event === 'done');
    expect(doneEvent?.data.source).toBe('fallback');
  });

  it('returns source:fallback when LLM times out', async () => {
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
      .parse((r, cb) => {
        let d = '';
        r.on('data', (c: Buffer) => { d += c.toString(); });
        r.on('end', () => cb(null, d));
      });

    expect(res.status).toBe(200);
    const events = parseSse(res.body as string);
    const doneEvent = events.find((e) => e.event === 'done');
    expect(doneEvent?.data.source).toBe('fallback');
  });
});
