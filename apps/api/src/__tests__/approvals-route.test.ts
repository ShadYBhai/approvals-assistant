import request from 'supertest';
import { createApp, LlmClient } from '../app';

const stubLlm: LlmClient = {
  completeJson: async () => ({}),
  stream: async function* () { yield ''; },
};

const app = createApp({ llm: stubLlm });

describe('GET /api/approvals', () => {
  it('returns 200 with exactly 4 items', async () => {
    const res = await request(app).get('/api/approvals');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(4);
  });

  it('each item has the required fields', async () => {
    const res = await request(app).get('/api/approvals');
    for (const item of res.body) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('type');
      expect(item).toHaveProperty('submittedBy');
      expect(item).toHaveProperty('status');
      expect(item).toHaveProperty('date');
    }
  });

  it('returns items with ids a1, a2, a3, a4 in order', async () => {
    const res = await request(app).get('/api/approvals');
    const ids = res.body.map((item: { id: string }) => item.id);
    expect(ids).toEqual(['a1', 'a2', 'a3', 'a4']);
  });

  it('each item passes the ApprovalSchema', async () => {
    const { ApprovalSchema } = await import('@approvals/contracts');
    const res = await request(app).get('/api/approvals');
    for (const item of res.body) {
      expect(() => ApprovalSchema.parse(item)).not.toThrow();
    }
  });
});
