'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { streamPost, RateLimitError } from '../lib/sse-client';
import type { Message } from '../store';

export function TeachCard() {
  const { sessionId } = useStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  async function sendMessage(message?: string) {
    if (isStreaming) return;
    setError(null);
    setIsFallback(false);
    setIsStreaming(true);
    setStreaming('');
    setStarted(true);

    if (message) {
      setMessages((prev) => [...prev, { role: 'user', content: message }]);
    }

    let reply = '';
    try {
      for await (const { event, data } of streamPost(
        '/api/assistant/teach',
        { message, history: messages, language: 'en' },
        sessionId,
      )) {
        if (event === 'token') {
          reply += (data as { t: string }).t;
          setStreaming(reply);
        } else if (event === 'done') {
          const d = data as { source: string };
          if (d.source === 'fallback') setIsFallback(true);
        }
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      setStreaming('');
    } catch (err) {
      if (err instanceof RateLimitError) {
        setError(`Too many requests — please wait ${err.retryAfterSec}s and try again.`);
      } else {
        setError((err as Error).message ?? 'Something went wrong');
      }
    } finally {
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const msg = input.trim();
      if (msg) { setInput(''); sendMessage(msg); }
    }
  }

  return (
    <div className="feature-view">
      <h2>Teach me</h2>

      {isFallback && (
        <div className="fallback-banner" aria-live="polite">
          AI unavailable — showing standard guidance
        </div>
      )}

      {!started && (
        <button className="action-btn" onClick={() => sendMessage(undefined)} disabled={isStreaming}>
          Start the guide →
        </button>
      )}

      <div className="chat-history">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`chat-bubble ${m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}
          >
            {m.content}
          </div>
        ))}

        {streaming && (
          <div className="chat-bubble chat-bubble-streaming" aria-live="polite">
            {streaming}
          </div>
        )}

        {!started && !isStreaming && (
          <p style={{ fontSize: '0.82rem', color: '#6b7280' }}>
            Click "Start the guide" to begin step-by-step onboarding.
          </p>
        )}

        {error && <div className="error-banner" role="alert">{error}</div>}
        <div ref={bottomRef} />
      </div>

      {started && (
        <div className="input-row">
          <textarea
            rows={2}
            placeholder="Ask a follow-up…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            aria-label="Follow-up question"
          />
          <button
            className="send-btn"
            onClick={() => { const msg = input.trim(); if (msg) { setInput(''); sendMessage(msg); } }}
            disabled={isStreaming || !input.trim()}
          >
            {isStreaming ? '…' : 'Ask'}
          </button>
        </div>
      )}
    </div>
  );
}
