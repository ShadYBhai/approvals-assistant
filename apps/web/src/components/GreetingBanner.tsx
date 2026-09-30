'use client';

import { useEffect } from 'react';
import { useStore } from '../store';
import { streamPost } from '../lib/sse-client';

export function GreetingBanner() {
  const { sessionId, greetingText, greetingStatus, setGreeting } = useStore();

  async function loadGreeting() {
    setGreeting('', 'loading');
    let text = '';
    try {
      for await (const { event, data } of streamPost(
        '/api/assistant/greeting',
        { language: 'en' },
        sessionId,
      )) {
        if (event === 'token') {
          text += (data as { t: string }).t;
          setGreeting(text, 'loading');
        } else if (event === 'done') {
          const d = data as { source: string };
          setGreeting(text, d.source === 'fallback' ? 'fallback' : 'ready');
        }
      }
    } catch {
      setGreeting(`You have approvals waiting for review.`, 'fallback');
    }
  }

  useEffect(() => {
    if (greetingStatus === 'idle') loadGreeting();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greetingStatus]);

  if (greetingStatus === 'idle' || greetingStatus === 'loading') {
    return (
      <div className="panel-greeting">
        <span className="panel-greeting-loading">Loading greeting…</span>
      </div>
    );
  }

  return (
    <div className="panel-greeting">
      {greetingText}
    </div>
  );
}
