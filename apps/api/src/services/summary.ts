import { z } from 'zod';
import { PriorityItemSchema, type SummaryResponse } from '@approvals/contracts';
import type { LlmClient } from '../app';
import { summaryPrompt, summaryToolSchema } from '../prompts/summary.v1';
import { summaryFallback } from './fallback';
import { LlmError } from './llm';
import fixture from '../data/approvals.fixture.json';

const VALID_IDS = new Set(fixture.map((item) => item.id));

const llmOutputSchema = z.object({
  headline: z.string(),
  priorities: z.array(PriorityItemSchema),
  narrative: z.string(),
});

export async function buildSummaryData(
  llm: LlmClient,
  language: string,
  signal: AbortSignal,
): Promise<SummaryResponse> {
  try {
    const raw = await llm.completeJson(
      {
        system: summaryPrompt.system,
        user: summaryPrompt.buildUser(fixture as Parameters<typeof summaryPrompt.buildUser>[0], language),
        toolName: 'report_summary',
        toolSchema: summaryToolSchema,
        promptVersion: summaryPrompt.version,
        feature: 'summary',
      },
      { signal },
    );

    const parsed = llmOutputSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn('[summary] invalid shape from LLM, using fallback');
      return summaryFallback();
    }

    const unknownIds = parsed.data.priorities.filter((p) => !VALID_IDS.has(p.itemId));
    if (unknownIds.length > 0) {
      console.warn('[summary] unknown itemIds in priorities, using fallback');
      return summaryFallback();
    }

    return {
      ...parsed.data,
      source: 'ai',
      promptVersion: summaryPrompt.version,
    };
  } catch (err) {
    if (err instanceof LlmError) {
      console.warn(`[summary] LLM error ${err.code}: ${err.message}`);
    } else {
      console.warn('[summary] unexpected error:', err);
    }
    return summaryFallback();
  }
}
