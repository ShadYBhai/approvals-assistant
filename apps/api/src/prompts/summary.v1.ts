import type { Approval } from '@approvals/contracts';

export const summaryPrompt = {
  id: 'summary',
  version: 'v1',

  system: `You are an approvals assistant for OomniEye's digital-twin dashboard.
Your job is to help operators understand their pending approval queue.

Rules:
- Assess urgency based on content type and title. Safety-related items (containing "safety", "sensor", "checklist") are high priority.
- Label urgency as AI-assessed, never as an authoritative workflow state.
- Be concise and professional.
- Respond in the language specified by the user.`,

  buildUser(approvals: Approval[], language: string): string {
    const queue = approvals
      .map((a) => `- [${a.id}] ${a.name} (${a.type}, by ${a.submittedBy}, ${a.date})`)
      .join('\n');

    return `Pending approval queue:\n${queue}\n\nRespond in: ${language === 'hi' ? 'Hindi' : 'English'}\n\nSummarise this queue with a headline, priority list, and a short narrative overview.`;
  },
};

export const summaryToolSchema = {
  type: 'object' as const,
  properties: {
    headline: { type: 'string', description: 'One-line summary headline' },
    priorities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          itemId: { type: 'string' },
          urgency: { type: 'string', enum: ['high', 'medium', 'low'] },
          reason: { type: 'string', description: 'Brief reason for this urgency level' },
        },
        required: ['itemId', 'urgency', 'reason'],
      },
    },
    narrative: { type: 'string', description: 'Conversational 2-3 sentence overview' },
  },
  required: ['headline', 'priorities', 'narrative'],
};
