import express from 'express';
import cors from 'cors';


export interface LlmJsonRequest {
  system: string;
  user: string;
  toolName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toolSchema: Record<string, any>;
  promptVersion: string;
  feature: string;
  maxTokens?: number;
}

export interface LlmTextRequest {
  system: string;
  user: string;
  promptVersion: string;
  feature: string;
  maxTokens?: number;
}

export interface LlmClient {
  completeJson(req: LlmJsonRequest, opts: { signal: AbortSignal }): Promise<unknown>;
  stream(req: LlmTextRequest, opts: { signal: AbortSignal }): AsyncIterable<string>;
}

export interface AppOptions {
  llm: LlmClient;
  timeoutMs?: number;
}

export function createApp({ llm: _llm, timeoutMs: _timeoutMs = 8000 }: AppOptions) {
  const app = express();

  app.use(express.json());
  app.use(
    cors({
      origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    }),
  );


  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });


  return app;
}
