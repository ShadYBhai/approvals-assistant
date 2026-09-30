import type { SummaryResponse } from '@approvals/contracts';
import fixture from '../data/approvals.fixture.json';

// Deterministic sort: safety-related first, then PDF, Folder, Video, Image
const TYPE_ORDER: Record<string, number> = { PDF: 0, Folder: 1, Video: 2, Image: 3 };

function isSafety(name: string) {
  return /safety|sensor|checklist/i.test(name);
}

const sortedQueue = [...fixture].sort((a, b) => {
  const aSafety = isSafety(a.name) ? 0 : 1;
  const bSafety = isSafety(b.name) ? 0 : 1;
  if (aSafety !== bSafety) return aSafety - bSafety;
  return (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9);
});

export function summaryFallback(): SummaryResponse {
  return {
    headline: `${fixture.length} approvals pending review`,
    priorities: sortedQueue.map((item, i) => ({
      itemId: item.id,
      urgency: (isSafety(item.name) ? 'high' : i === 1 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
      reason: isSafety(item.name) ? 'Safety-related — review first' : 'Standard review order',
    })),
    narrative: `You have ${fixture.length} approvals waiting for review. ${sortedQueue.map((i) => i.name).join('; ')}.`,
    source: 'fallback',
    promptVersion: 'fallback-v1',
  };
}
