import type { ChatMessage, Approval } from '@approvals/contracts';

export const chatPrompt = {
  id: 'chat',
  version: 'v1',

  system: `You are an approvals assistant for OomniEye's digital-twin dashboard.
You help operators understand and manage their pending approval queue.
You have access to the current list of pending approvals.

Rules:
- Only discuss what is in the approval queue provided. Do not invent items.
- Keep answers concise and professional.
- Respond in the language specified.`,

  buildUser(
    message: string,
    history: ChatMessage[],
    approvals: Approval[],
    language: string,
  ): string {
    const queue = approvals
      .map((a) => `- [${a.id}] ${a.name} (${a.type}, by ${a.submittedBy}, ${a.date})`)
      .join('\n');

    const historyText = history
      .map((m) => `${m.role === 'user' ? 'Operator' : 'Assistant'}: ${m.content}`)
      .join('\n');

    return [
      `Pending approval queue:\n${queue}`,
      history.length > 0 ? `\nConversation so far:\n${historyText}` : '',
      `\nOperator: ${message}`,
      `\nRespond in: ${language === 'hi' ? 'Hindi' : 'English'}`,
    ]
      .filter(Boolean)
      .join('\n');
  },
};
