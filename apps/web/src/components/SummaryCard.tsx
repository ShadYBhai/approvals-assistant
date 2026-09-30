'use client';

import { useStore, type SummaryData } from '../store';
import { streamPost } from '../lib/sse-client';
import type { PriorityItem } from '@approvals/contracts';

export function SummaryCard() {
  const {
    sessionId, status, summaryData, streamingText,
    errorMessage, setStatus, setSummaryData,
    appendStreamingText, resetStreaming, setError,
  } = useStore();

  const isActive = status === 'loading' || status === 'streaming';

  async function handleClick() {
    if (isActive) return;
    resetStreaming();
    setSummaryData(null);
    setStatus('loading');

    try {
      let structuredData: Omit<SummaryData, 'narrative' | 'source' | 'promptVersion'> | null = null;
      let source: 'ai' | 'fallback' = 'ai';
      let promptVersion = 'v1';

      for await (const { event, data } of streamPost(
        '/api/assistant/summary',
        { language: 'en' },
        sessionId,
      )) {
        if (event === 'summary') {
          const d = data as { headline: string; priorities: PriorityItem[] };
          structuredData = { headline: d.headline, priorities: d.priorities };
          setStatus('streaming');
        } else if (event === 'token') {
          appendStreamingText((data as { t: string }).t);
        } else if (event === 'done') {
          const d = data as { source: 'ai' | 'fallback'; promptVersion: string };
          source = d.source;
          promptVersion = d.promptVersion;
        }
      }

      setSummaryData({
        headline: structuredData?.headline ?? '',
        priorities: structuredData?.priorities ?? [],
        narrative: '',
        source,
        promptVersion,
      });
      setStatus(source === 'fallback' ? 'fallback' : 'idle');
    } catch (err) {
      setError((err as Error).message ?? 'Something went wrong');
    }
  }

  if (status === 'idle' || (status !== 'loading' && status !== 'streaming' && !summaryData && !errorMessage)) {
    return (
      <div className="feature-view">
        <h2>Present me Summary</h2>
        <button className="action-btn" onClick={handleClick} aria-label="Present me Summary">
          Generate summary →
        </button>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="feature-view">
        <h2>Present me Summary</h2>
        <span className="loading-text">Loading…</span>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="feature-view">
        <h2>Present me Summary</h2>
        <div role="alert" className="error-banner">
          <p>{errorMessage}</p>
        </div>
        <button className="action-btn" onClick={handleClick}>Try again</button>
      </div>
    );
  }

  return (
    <div className="feature-view">
      <h2>Present me Summary</h2>

      {summaryData && <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{summaryData.headline}</p>}

      {(status === 'fallback' || summaryData?.source === 'fallback') && (
        <div className="fallback-banner" aria-live="polite">
          AI unavailable — showing standard guidance
        </div>
      )}

      {summaryData && summaryData.priorities.length > 0 && (
        <div className="summary-priorities">
          <p className="ai-label">AI-assessed priority</p>
          {summaryData.priorities.map((p) => (
            <div key={p.itemId} className="priority-row">
              <span className={`urgency-${p.urgency}`}>{p.urgency.toUpperCase()}</span>
              <span style={{ flex: 1 }}>[{p.itemId}] {p.reason}</span>
            </div>
          ))}
        </div>
      )}

      <div aria-live="polite" className="streaming-text">{streamingText}</div>

      <button className="action-btn" onClick={handleClick}>Refresh</button>
    </div>
  );
}
