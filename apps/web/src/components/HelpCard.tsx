'use client';

import { useState } from 'react';
import { useStore } from '../store';
import { streamPost } from '../lib/sse-client';

export function HelpCard() {
  const { sessionId, helpSources, setHelpSources } = useStore();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asked, setAsked] = useState(false);

  async function handleAsk() {
    const q = question.trim();
    if (!q || isStreaming) return;

    setError(null);
    setIsFallback(false);
    setAnswer('');
    setHelpSources([]);
    setIsStreaming(true);
    setAsked(true);

    let text = '';
    try {
      for await (const { event, data } of streamPost(
        '/api/assistant/help',
        { question: q },
        sessionId,
      )) {
        if (event === 'token') {
          text += (data as { t: string }).t;
          setAnswer(text);
        } else if (event === 'done') {
          const d = data as { source: string; sources?: string[] };
          if (d.source === 'fallback') setIsFallback(true);
          if (d.sources) setHelpSources(d.sources);
        }
      }
    } catch (err) {
      setError((err as Error).message ?? 'Something went wrong');
    } finally {
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  }

  return (
    <div className="feature-view">
      <h2>Help me</h2>

      {isFallback && (
        <div className="fallback-banner" aria-live="polite">
          AI unavailable — showing standard guidance
        </div>
      )}

      <div className="input-row">
        <textarea
          rows={2}
          placeholder="Ask a policy question…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          aria-label="Policy question"
        />
        <button
          className="send-btn"
          onClick={handleAsk}
          disabled={isStreaming || !question.trim()}
        >
          {isStreaming ? '…' : 'Ask'}
        </button>
      </div>

      {error && <div className="error-banner" role="alert">{error}</div>}

      {asked && (
        <div className="streaming-text" aria-live="polite">
          {answer || (isStreaming ? <span className="loading-text">Searching policy…</span> : null)}
        </div>
      )}

      {helpSources.length > 0 && (
        <div className="help-sources">
          Sources: {helpSources.map((s) => <span key={s}>{s}</span>)}
        </div>
      )}
    </div>
  );
}
