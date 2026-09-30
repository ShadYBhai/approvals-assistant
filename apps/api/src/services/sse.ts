import type { Writable } from 'stream';

function frame(event: string, data: object): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function writeSseToken(res: Writable, token: string): void {
  res.write(frame('token', { t: token }));
}

export function writeSseDone(
  res: Writable,
  payload: { source: 'ai' | 'fallback'; promptVersion: string; sources?: string[] },
): void {
  res.write(frame('done', payload));
}

export function writeSseFallback(
  res: Writable,
  payload: { reason: string; text: string },
): void {
  res.write(frame('fallback', payload));
}

export function setSseHeaders(res: {
  setHeader: (k: string, v: string) => void;
  flushHeaders: () => void;
}): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}
