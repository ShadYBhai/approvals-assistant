import request from 'supertest';
import { createApp, LlmClient } from '../app';

// Minimal stub — smoke test doesn't call the LLM
const stubLlm: LlmClient = {
  completeJson: async () => ({}),
  stream: async function* () { yield ''; },
};

const app = createApp({ llm: stubLlm });

describe('api smoke', () => {
  it('GET /health returns 200 { ok: true }', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
