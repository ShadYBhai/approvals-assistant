import { Writable } from 'stream';
import { writeSseToken, writeSseDone, writeSseFallback } from '../services/sse';

function makeCapture() {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(chunk.toString());
      cb();
    },
  });
  return { stream, chunks };
}

describe('SSE helpers', () => {
  it('writeSseToken writes correct SSE frame', () => {
    const { stream, chunks } = makeCapture();
    writeSseToken(stream, 'Hello');
    expect(chunks[0]).toBe('event: token\ndata: {"t":"Hello"}\n\n');
  });

  it('writeSseDone writes correct done frame', () => {
    const { stream, chunks } = makeCapture();
    writeSseDone(stream, { source: 'ai', promptVersion: 'v1' });
    expect(chunks[0]).toBe(
      'event: done\ndata: {"source":"ai","promptVersion":"v1"}\n\n',
    );
  });

  it('writeSseFallback writes correct fallback frame', () => {
    const { stream, chunks } = makeCapture();
    writeSseFallback(stream, { reason: 'timeout', text: 'AI unavailable' });
    expect(chunks[0]).toBe(
      'event: fallback\ndata: {"reason":"timeout","text":"AI unavailable"}\n\n',
    );
  });

  it('writeSseDone includes sources when provided', () => {
    const { stream, chunks } = makeCapture();
    writeSseDone(stream, { source: 'ai', promptVersion: 'v1', sources: ['chunk-1'] });
    const parsed = JSON.parse(chunks[0].split('data: ')[1]);
    expect(parsed.sources).toEqual(['chunk-1']);
  });
});
