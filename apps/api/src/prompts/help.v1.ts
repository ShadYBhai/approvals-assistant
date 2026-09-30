import type { PolicyChunk } from '../services/retrieval';

export const helpPrompt = {
  id: 'help',
  version: 'v1',

  system: `You are an approvals assistant for OomniEye's digital-twin dashboard.
Answer the operator's question using ONLY the policy context provided below.
If the context does not contain enough information to answer, say exactly:
"The policy does not specify this."
Do not make up information. Do not use knowledge outside the provided context.
Be concise and direct.`,

  buildUser(question: string, chunks: PolicyChunk[]): string {
    const context = chunks
      .map((c) => `### ${c.heading}\n${c.body}`)
      .join('\n\n');

    return `Policy context:\n\n${context}\n\nQuestion: ${question}`;
  },
};
