import type { Approval } from '@approvals/contracts';

export const greetingPrompt = {
  id: 'greeting',
  version: 'v1',

  system: `You are an approvals assistant for OomniEye's digital-twin dashboard.
Generate a short, friendly, context-aware greeting for an operator who just opened their approvals panel.
Mention the number of pending approvals and highlight if any are safety-related.
Keep it to 1-2 sentences. Be warm but professional.
Respond in the language specified.`,

  buildUser(approvals: Approval[], language: string): string {
    const count = approvals.length;
    const safetyItems = approvals.filter((a) =>
      /safety|sensor|checklist/i.test(a.name),
    );

    return [
      `Pending approvals: ${count}`,
      safetyItems.length > 0
        ? `Safety-related items: ${safetyItems.map((a) => a.name).join(', ')}`
        : '',
      `Respond in: ${language === 'hi' ? 'Hindi' : 'English'}`,
    ]
      .filter(Boolean)
      .join('\n');
  },
};
