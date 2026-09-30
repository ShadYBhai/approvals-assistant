'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { streamPost } from '../lib/sse-client';

export function ChatCard() {
  const { sessionId, messages, addMessage } = useStore();
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  async function handleSend() {
    const msg = input.trim();
    if (!msg || isStreaming) return;

    setInput('');
    setError(null);
    setIsFallback(false);
    addMessage({ role: 'user', content: msg });
    setIsStreaming(true);
    setStreaming('');

    let reply = '';
    try {
      for await (const { event, data } of streamPost(
        '/api/assistant/chat',
        { message: msg, history: messages, language: 'en' },
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
      addMessage({ role: 'assistant', content: reply });
      setStreaming('');
    } catch (err) {
      setError((err as Error).message ?? 'Something went wrong');
    } finally {
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="feature-view">
      <h2>Talk to me</h2>

      {isFallback && (
        <div className="fallback-banner" aria-live="polite">
          AI unavailable — showing standard guidance
        </div>
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

        {error && (
          <div className="error-banner" role="alert">{error}</div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="input-row">
        <textarea
          rows={2}
          placeholder="Ask about the queue…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          aria-label="Chat message"
        />
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={isStreaming || !input.trim()}
        >
          {isStreaming ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
