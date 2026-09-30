import request from 'supertest';
import { createApp, LlmClient } from '../app';

const validOutput = {
  headline: '4 approvals pending',
  priorities: [
    { itemId: 'a3', urgency: 'high', reason: 'Safety' },
    { itemId: 'a1', urgency: 'medium', reason: 'Onboarding' },
    { itemId: 'a2', urgency: 'medium', reason: 'Video' },
    { itemId: 'a4', urgency: 'low', reason: 'Map' },
  ],
  narrative: 'Review safety items first.',
};

const successLlm: LlmClient = {
  completeJson: async () => validOutput,
  stream: async function* () { yield ''; },
};

// LLM that waits for abort signal — used to test timeout path
const hangingLlm: LlmClient = {
  completeJson: (_req, opts) =>
    new Promise((_res, reject) => {
      opts.signal.addEventListener('abort', () =>
        reject(Object.assign(new Error('AbortError'), { name: 'AbortError' })),
      );
    }),
  stream: async function* () { yield ''; },
};

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

describe('POST /api/assistant/summary', () => {
  it('returns 400 when body is invalid', async () => {
    const app = createApp({ llm: successLlm });
    const res = await request(app)
      .post('/api/assistant/summary')
      .set('X-Session-Id', 'test-session')
      .send({ language: 'invalid-lang' });
    expect(res.status).toBe(400);
  });

  it('success path: streams summary + done events with source:ai', async () => {
    const app = createApp({ llm: successLlm });
    const res = await request(app)
      .post('/api/assistant/summary')
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
    const summaryEvent = events.find((e) => e.event === 'summary');
    const doneEvent = events.find((e) => e.event === 'done');

    expect(summaryEvent).toBeDefined();
    expect(summaryEvent?.data.headline).toBe(validOutput.headline);
    expect(doneEvent?.data.source).toBe('ai');
  });

  it('timeout path: returns 200 with source:fallback, never 500', async () => {
    const app = createApp({ llm: hangingLlm, timeoutMs: 80 });
    const start = Date.now();

    const res = await request(app)
      .post('/api/assistant/summary')
      .set('X-Session-Id', 'test-session')
      .send({ language: 'en' })
      .buffer(true)
      .parse((r, cb) => {
        let d = '';
        r.on('data', (c: Buffer) => { d += c.toString(); });
        r.on('end', () => cb(null, d));
      });

    const elapsed = Date.now() - start;
    expect(res.status).toBe(200);
    expect(elapsed).toBeLessThan(2000);

    const events = parseSse(res.body as string);
    const doneEvent = events.find((e) => e.event === 'done');
    expect(doneEvent?.data.source).toBe('fallback');
  });

  it('throwing LLM returns 200 with source:fallback', async () => {
    const throwingLlm: LlmClient = {
      completeJson: async () => { throw new Error('network failure'); },
      stream: async function* () { yield ''; },
    };
    const app = createApp({ llm: throwingLlm });
    const res = await request(app)
      .post('/api/assistant/summary')
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
