import { retrieve } from '../services/retrieval';

describe('retrieve()', () => {
  it('picks the safety chunk for a safety-related question', () => {
    const chunks = retrieve('what should I check for safety equipment?');
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].id).toBe('safety');
  });

  it('picks the video-image chunk for a video question', () => {
    const chunks = retrieve('how do I review a video submission?');
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].id).toBe('video-image');
  });

  it('picks the rejection chunk for an escalation question', () => {
    const chunks = retrieve('when should I escalate a rejected item?');
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].id).toBe('rejection-escalation');
  });

  it('returns no chunks for a completely unrelated question', () => {
    const chunks = retrieve('what is the weather like today in Tokyo');
    expect(chunks).toHaveLength(0);
  });

  it('returns at most 2 chunks', () => {
    const chunks = retrieve('safety review approval process');
    expect(chunks.length).toBeLessThanOrEqual(2);
  });
});
