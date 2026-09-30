import type { SummaryResponse } from '@approvals/contracts';
import fixture from '../data/approvals.fixture.json';
import type { PolicyChunk } from './retrieval'; // type-only import — value never used at runtime

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

export function greetingFallback(): { text: string; source: 'fallback'; promptVersion: string } {
  return {
    text: `You have ${fixture.length} approvals waiting for review.`,
    source: 'fallback',
    promptVersion: 'fallback-v1',
  };
}

export function teachFallback(): { text: string; source: 'fallback'; promptVersion: string } {
  const steps = [
    '1. Open the item and confirm the title and type match the actual content.',
    '2. Identify the content type (Folder, Video, PDF, Image) and apply the right review rules.',
    '3. Review the content carefully against the checklist for that type.',
    '4. Check the item against the approval policy — safety items take priority.',
    '5. Make a decision: approve, return for changes, or reject.',
    '6. Record a written reason for your decision so the audit trail is complete.',
  ].join('\n');
  return {
    text: `Here is the standard 6-step review workflow:\n\n${steps}`,
    source: 'fallback',
    promptVersion: 'fallback-v1',
  };
}

export function chatFallback(): { text: string; source: 'fallback'; promptVersion: string } {
  const list = fixture.map((i) => `• ${i.name} (${i.type})`).join('\n');
  return {
    text: `Chat is temporarily unavailable. Here are your pending approvals:\n\n${list}`,
    source: 'fallback',
    promptVersion: 'fallback-v1',
  };
}

export function helpFallback(chunks: PolicyChunk[]): { text: string; source: 'fallback'; promptVersion: string } {
  if (chunks.length === 0) {
    return {
      text: 'The policy does not specify this.',
      source: 'fallback',
      promptVersion: 'fallback-v1',
    };
  }
  const body = chunks.map((c) => `**${c.heading}**\n${c.body}`).join('\n\n');
  return {
    text: `AI unavailable — showing policy guidance directly:\n\n${body}`,
    source: 'fallback',
    promptVersion: 'fallback-v1',
  };
}

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
