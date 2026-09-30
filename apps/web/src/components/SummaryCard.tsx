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
      <button
        onClick={handleClick}
        className="summary-card-btn"
        aria-label="Present me Summary"
      >
        🗒️ Present me Summary
      </button>
    );
  }

  if (status === 'loading') {
    return <div className="summary-card-loading">Loading…</div>;
  }

  if (errorMessage) {
    return (
      <div role="alert" className="summary-card-error">
        <p>{errorMessage}</p>
        <button onClick={handleClick}>Try again</button>
      </div>
    );
  }

  return (
    <div className="summary-card-result">
      {summaryData && (
        <h3>{summaryData.headline}</h3>
      )}

      {(status === 'fallback' || summaryData?.source === 'fallback') && (
        <p className="fallback-indicator" aria-live="polite">
          AI unavailable — showing standard guidance
        </p>
      )}

      <div aria-live="polite" className="narrative">
        {streamingText}
      </div>

      <button onClick={handleClick} style={{ marginTop: '1rem' }}>
        Refresh
      </button>
    </div>
  );
}
