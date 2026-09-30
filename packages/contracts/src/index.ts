import { z } from 'zod';

// Approval item shape — matches the fixture in api/src/data
export const ApprovalSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['Folder', 'Video', 'PDF', 'Image']),
  submittedBy: z.string(),
  status: z.string(),
  date: z.string(),
  location: z.string().optional(),
});
export type Approval = z.infer<typeof ApprovalSchema>;

// Language param — default English, supports Hindi
export const LanguageSchema = z.enum(['en', 'hi']).default('en');
export type Language = z.infer<typeof LanguageSchema>;

// Whether the response came from the real AI or the deterministic fallback
export const AiSourceSchema = z.enum(['ai', 'fallback']);
export type AiSource = z.infer<typeof AiSourceSchema>;

// POST /api/assistant/summary
export const SummaryRequestSchema = z.object({
  language: LanguageSchema,
});
export type SummaryRequest = z.infer<typeof SummaryRequestSchema>;

export const PriorityItemSchema = z.object({
  itemId: z.string(),
  urgency: z.enum(['high', 'medium', 'low']),
  reason: z.string(),
});
export type PriorityItem = z.infer<typeof PriorityItemSchema>;

export const SummaryResponseSchema = z.object({
  headline: z.string(),
  priorities: z.array(PriorityItemSchema),
  narrative: z.string(),
  source: AiSourceSchema,
  promptVersion: z.string(),
});
export type SummaryResponse = z.infer<typeof SummaryResponseSchema>;

// Shared chat message shape used by Talk and Teach
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(2000),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// POST /api/assistant/chat
export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(500),
  history: z.array(ChatMessageSchema).max(10),
  language: LanguageSchema,
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// POST /api/assistant/help
export const HelpRequestSchema = z.object({
  question: z.string().min(1).max(500),
});
export type HelpRequest = z.infer<typeof HelpRequestSchema>;

// POST /api/assistant/teach
export const TeachRequestSchema = z.object({
  message: z.string().max(500).optional(),
  history: z.array(ChatMessageSchema).max(10),
  language: LanguageSchema,
});
export type TeachRequest = z.infer<typeof TeachRequestSchema>;

// POST /api/assistant/greeting
export const GreetingRequestSchema = z.object({
  language: LanguageSchema,
});
export type GreetingRequest = z.infer<typeof GreetingRequestSchema>;

// SSE event payloads sent to the browser
export const SseDoneSchema = z.object({
  source: AiSourceSchema,
  promptVersion: z.string(),
  sources: z.array(z.string()).optional(),
});
export type SseDone = z.infer<typeof SseDoneSchema>;

export const SseFallbackSchema = z.object({
  reason: z.string(),
  text: z.string(),
});
export type SseFallback = z.infer<typeof SseFallbackSchema>;

export { z };
