import request from 'supertest';
import { createApp, LlmClient } from '../app';

function makeLlm(override?: Partial<LlmClient>): LlmClient {
  return {
    completeJson: jest.fn().mockResolvedValue({}),
    stream: async function* () { yield 'Step 1: open the item.'; },
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

// ── Teach ──────────────────────────────────────────────────────────────────

describe('POST /api/assistant/teach', () => {
  it('returns 400 when body is invalid', async () => {
    const app = createApp({ llm: makeLlm() });
    const res = await request(app)
      .post('/api/assistant/teach')
      .set('X-Session-Id', 'test-session')
      .send({ history: 'not-an-array' });
    expect(res.status).toBe(400);
  });

  it('streams done with source:ai on first message (no history)', async () => {
    const app = createApp({ llm: makeLlm(), timeoutMs: 5000 });
    const res = await request(app)
      .post('/api/assistant/teach')
      .set('X-Session-Id', 'test-session')
      .send({ history: [], language: 'en' })
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

  it('adapts to a follow-up message', async () => {
    const app = createApp({ llm: makeLlm(), timeoutMs: 5000 });
    const res = await request(app)
      .post('/api/assistant/teach')
      .set('X-Session-Id', 'test-session')
      .send({
        message: 'what do I do after opening the item?',
        history: [
          { role: 'assistant', content: 'Step 1: open the item.' },
        ],
        language: 'en',
      })
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
      .post('/api/assistant/teach')
      .set('X-Session-Id', 'test-session')
      .send({ history: [], language: 'en' })
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

// ── Greeting ───────────────────────────────────────────────────────────────

describe('POST /api/assistant/greeting', () => {
  it('returns 400 when body is invalid', async () => {
    const app = createApp({ llm: makeLlm() });
    const res = await request(app)
      .post('/api/assistant/greeting')
      .set('X-Session-Id', 'test-session')
      .send({ language: 'invalid-lang' });
    expect(res.status).toBe(400);
  });

  it('streams done with source:ai on valid request', async () => {
    const app = createApp({ llm: makeLlm(), timeoutMs: 5000 });
    const res = await request(app)
      .post('/api/assistant/greeting')
      .set('X-Session-Id', 'test-session')
      .send({ language: 'en' })
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
      .post('/api/assistant/greeting')
      .set('X-Session-Id', 'test-session')
      .send({ language: 'en' })
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
