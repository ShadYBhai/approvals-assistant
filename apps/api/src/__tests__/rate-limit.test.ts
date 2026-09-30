import request from 'supertest';
import { createApp, LlmClient } from '../app';

const successLlm: LlmClient = {
  completeJson: async () => ({
    headline: '4 approvals',
    priorities: [],
    narrative: 'All good.',
  }),
  stream: async function* () { yield 'ok'; },
};

describe('Rate limiting on AI routes', () => {
  it('returns 429 with retryAfterSec after exceeding the limit', async () => {
    // Very low limit so we can trigger it in a test
    const app = createApp({ llm: successLlm, rateLimit: { max: 2, windowMs: 60_000 } });

    // First two requests succeed
    await request(app)
      .post('/api/assistant/greeting')
      .set('X-Session-Id', 'rate-test-session')
      .send({ language: 'en' });

    await request(app)
      .post('/api/assistant/greeting')
      .set('X-Session-Id', 'rate-test-session')
      .send({ language: 'en' });

    // Third request should be rate limited
    const res = await request(app)
      .post('/api/assistant/greeting')
      .set('X-Session-Id', 'rate-test-session')
      .send({ language: 'en' });

    expect(res.status).toBe(429);
    expect(res.body).toHaveProperty('error');
    expect(res.body).toHaveProperty('retryAfterSec');
    expect(typeof res.body.retryAfterSec).toBe('number');
  });

  it('does NOT rate-limit GET /api/approvals (only AI routes)', async () => {
    const app = createApp({ llm: successLlm, rateLimit: { max: 1, windowMs: 60_000 } });

    // Hit the AI limit
    await request(app)
      .post('/api/assistant/greeting')
      .set('X-Session-Id', 'rate-test-session-2')
      .send({ language: 'en' });

    // Fixture route should still work
    const res = await request(app)
      .get('/api/approvals')
      .set('X-Session-Id', 'rate-test-session-2');

    expect(res.status).toBe(200);
  });
});
