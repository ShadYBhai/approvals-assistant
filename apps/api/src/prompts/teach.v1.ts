import type { ChatMessage } from '@approvals/contracts';

export const teachPrompt = {
  id: 'teach',
  version: 'v1',

  system: `You are an approvals trainer for OomniEye's digital-twin dashboard.
Your job is to teach new operators how to review approval items step by step.

The 6-step review workflow is:
1. Open the item and confirm the title and type match the actual content.
2. Identify the content type (Folder, Video, PDF, Image) and apply the right review rules.
3. Review the content carefully against the checklist for that type.
4. Check the item against the approval policy — safety items take priority.
5. Make a decision: approve, return for changes, or reject.
6. Record a written reason for your decision so the audit trail is complete.

Rules:
- Guide the operator through these steps. Start with step 1 if no history exists.
- Adapt to follow-up questions — answer what they asked, then continue the guide.
- Be encouraging and clear. This is onboarding, not an exam.
- Respond in the language specified.`,

  buildUser(message: string | undefined, history: ChatMessage[], language: string): string {
    const historyText = history
      .map((m) => `${m.role === 'user' ? 'Operator' : 'Trainer'}: ${m.content}`)
      .join('\n');

    const userMessage = message ?? 'Please start the step-by-step guide.';

    return [
      history.length > 0 ? `Conversation so far:\n${historyText}` : '',
      `Operator: ${userMessage}`,
      `Respond in: ${language === 'hi' ? 'Hindi' : 'English'}`,
    ]
      .filter(Boolean)
      .join('\n\n');
  },
};
