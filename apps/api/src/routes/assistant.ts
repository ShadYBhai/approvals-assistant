import { Router } from 'express';
import { SummaryRequestSchema } from '@approvals/contracts';
import type { LlmClient } from '../app';
import { buildSummaryData } from '../services/summary';
import { summaryFallback } from '../services/fallback';
import { setSseHeaders, writeSseToken, writeSseDone } from '../services/sse';

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

  return router;
}
