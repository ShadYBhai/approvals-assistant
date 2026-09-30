import { Router } from 'express';
import { SummaryRequestSchema, HelpRequestSchema } from '@approvals/contracts';
import type { LlmClient } from '../app';
import { buildSummaryData } from '../services/summary';
import { summaryFallback } from '../services/fallback';
import { streamHelp } from '../services/help';
import { setSseHeaders, writeSseToken, writeSseDone, writeSseFallback } from '../services/sse';

export function createAssistantRouter(opts: { llm: LlmClient; timeoutMs: number }) {
  const { llm, timeoutMs } = opts;
  const router = Router();

  router.post('/summary', async (req, res) => {
    const parsed = SummaryRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues });
      return;
    }

    setSseHeaders(res);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    req.on('close', () => { clearTimeout(timer); controller.abort(); });

    try {
      const summary = await buildSummaryData(llm, parsed.data.language, controller.signal);

      // Send structured data first
      res.write(`event: summary\ndata: ${JSON.stringify({
        headline: summary.headline,
        priorities: summary.priorities,
      })}\n\n`);

      // Stream narrative token by token
      const words = summary.narrative.split(' ');
      for (const word of words) {
        writeSseToken(res, word + ' ');
      }

      writeSseDone(res, { source: summary.source, promptVersion: summary.promptVersion });
    } catch (_err) {
      const fb = summaryFallback();
      writeSseDone(res, { source: fb.source, promptVersion: fb.promptVersion });
    } finally {
      clearTimeout(timer);
      res.end();
    }
  });

  router.post('/help', async (req, res) => {
    const parsed = HelpRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues });
      return;
    }

    setSseHeaders(res);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    req.on('close', () => { clearTimeout(timer); controller.abort(); });

    try {
      for await (const event of streamHelp(llm, parsed.data.question, controller.signal)) {
        if (event.type === 'token') {
          writeSseToken(res, event.text);
        } else {
          writeSseDone(res, {
            source: event.source,
            promptVersion: event.promptVersion,
            sources: event.chunkIds,
          });
        }
      }
    } catch (_err) {
      writeSseFallback(res, { reason: 'unexpected', text: 'Help unavailable — please try again.' });
    } finally {
      clearTimeout(timer);
      res.end();
    }
  });

  return router;
}
