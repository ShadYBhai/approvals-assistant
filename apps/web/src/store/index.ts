import { create } from 'zustand';
import type { PriorityItem } from '@approvals/contracts';

export type View = 'home' | 'summary' | 'talk' | 'help' | 'teach';
export type Status = 'idle' | 'loading' | 'streaming' | 'error' | 'fallback';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface SummaryData {
  headline: string;
  priorities: PriorityItem[];
  narrative: string;
  source: 'ai' | 'fallback';
  promptVersion: string;
}

interface StoreState {
  sessionId: string;
  view: View;
  messages: Message[];
  status: Status;
  summaryData: SummaryData | null;
  streamingText: string;
  errorMessage: string | null;

  setView: (view: View) => void;
  setStatus: (status: Status) => void;
  setSummaryData: (data: SummaryData | null) => void;
  appendStreamingText: (token: string) => void;
  resetStreaming: () => void;
  addMessage: (msg: Message) => void;
  setError: (msg: string | null) => void;
}

function generateSessionId() {
  if (typeof sessionStorage !== 'undefined') {
    const existing = sessionStorage.getItem('sessionId');
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem('sessionId', id);
    return id;
  }
  return crypto.randomUUID();
}

export const useStore = create<StoreState>((set) => ({
  sessionId: generateSessionId(),
  view: 'home',
  messages: [],
  status: 'idle',
  summaryData: null,
  streamingText: '',
  errorMessage: null,

  setView: (view) => set({ view }),
  setStatus: (status) => set({ status }),
  setSummaryData: (data) => set({ summaryData: data }),
  appendStreamingText: (token) => set((s) => ({ streamingText: s.streamingText + token })),
  resetStreaming: () => set({ streamingText: '', errorMessage: null }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setError: (msg) => set({ errorMessage: msg, status: 'error' }),
}));
