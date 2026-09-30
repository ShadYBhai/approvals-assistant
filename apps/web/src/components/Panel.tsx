'use client';

import { useStore } from '../store';
import { GreetingBanner } from './GreetingBanner';
import { SummaryCard } from './SummaryCard';
import { ChatCard } from './ChatCard';
import { HelpCard } from './HelpCard';
import { TeachCard } from './TeachCard';

const HOME_CARDS = [
  { view: 'summary' as const, icon: '🗒️', label: 'Present me Summary' },
  { view: 'talk'    as const, icon: '💬', label: 'Talk to me' },
  { view: 'help'    as const, icon: '❓', label: 'Help me' },
  { view: 'teach'   as const, icon: '📚', label: 'Teach me' },
];

export function Panel() {
  const { view, setView, setGreeting, greetingStatus } = useStore();

  function handleReplayGreeting() {
    setGreeting('', 'idle');
    // GreetingBanner watches for idle status and re-fetches
    setTimeout(() => setGreeting('', 'idle'), 0);
  }

  function goHome() {
    setView('home');
  }

  return (
    <aside className="panel">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-header-avatar">🏢</div>
        <span className="panel-header-title">Approvals</span>
        <div className="panel-header-icons">ℹ ⤢ ✕</div>
      </div>

      {/* Sub-bar */}
      <div className="panel-subbar">
        <button className="panel-subbar-home" onClick={goHome} aria-label="Approvals">
          🏠 Approvals
        </button>
        {view !== 'home' && (
          <>
            <span className="panel-subbar-sep">›</span>
            <span className="panel-subbar-label">
              {view === 'summary' ? 'Summary' : view === 'talk' ? 'Talk' : view === 'help' ? 'Help' : 'Teach'}
            </span>
          </>
        )}
        <button className="panel-subbar-replay" onClick={handleReplayGreeting}>
          Replay Greeting ↗
        </button>
      </div>

      {/* Greeting */}
      <GreetingBanner />

      {/* Body */}
      <div className="panel-body">
        {view === 'home' && (
          <div className="home-grid">
            {HOME_CARDS.map((card) => (
              <button
                key={card.view}
                className="home-card"
                onClick={() => setView(card.view)}
              >
                <span className="home-card-icon">{card.icon}</span>
                <span className="home-card-label">{card.label}</span>
              </button>
            ))}
          </div>
        )}

        {view === 'summary' && <SummaryCard />}
        {view === 'talk'    && <ChatCard />}
        {view === 'help'    && <HelpCard />}
        {view === 'teach'   && <TeachCard />}
      </div>

      {/* Footer */}
      <div className="panel-footer">
        <span>4 items pending review</span>
        <a href="/api/approvals" target="_blank" rel="noopener noreferrer">View all →</a>
      </div>
    </aside>
  );
}
