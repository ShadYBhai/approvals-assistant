import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { approvalsRouter } from './routes/approvals';
import { createAssistantRouter } from './routes/assistant';

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

export interface RateLimitOptions {
  max: number;
  windowMs: number;
}

export interface AppOptions {
  llm: LlmClient;
  timeoutMs?: number;
  rateLimit?: RateLimitOptions;
}

export function createApp({ llm, timeoutMs = 8000, rateLimit: rlOpts }: AppOptions) {
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

  app.use('/api/approvals', approvalsRouter);

  // Rate limit only the AI assistant routes — per session ID, fallback to IP
  const limiter = rateLimit({
    windowMs: rlOpts?.windowMs ?? 60_000,
    max: rlOpts?.max ?? 30,
    keyGenerator: (req) => (req.headers['x-session-id'] as string) || req.ip || 'unknown',
    handler: (_req, res) => {
      const retryAfterSec = Math.ceil((rlOpts?.windowMs ?? 60_000) / 1000);
      res.status(429).json({ error: 'Too many requests', retryAfterSec });
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/assistant', limiter, createAssistantRouter({ llm, timeoutMs }));

  return app;
}
