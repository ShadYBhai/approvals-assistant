import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Panel } from '../components/Panel';
import { useStore } from '../store';

beforeEach(() => {
  useStore.setState({ view: 'home', status: 'idle', streamingText: '', errorMessage: null, summaryData: null, messages: [] });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
    new Response(new ReadableStream({ start(c) { c.close(); } })),
  ));
});

describe('Panel', () => {
  it('renders all 4 home cards', () => {
    render(<Panel />);
    expect(screen.getByText(/present me summary/i)).toBeInTheDocument();
    expect(screen.getByText(/talk to me/i)).toBeInTheDocument();
    expect(screen.getByText(/help me/i)).toBeInTheDocument();
    expect(screen.getByText(/teach me/i)).toBeInTheDocument();
  });

  it('shows Replay Greeting link', () => {
    render(<Panel />);
    expect(screen.getByText(/replay greeting/i)).toBeInTheDocument();
  });

  it('navigates to summary view when clicking Present me Summary', () => {
    render(<Panel />);
    fireEvent.click(screen.getByText(/present me summary/i));
    expect(useStore.getState().view).toBe('summary');
  });

  it('navigates back to home when clicking Approvals breadcrumb', () => {
    useStore.setState({ view: 'summary' });
    render(<Panel />);
    fireEvent.click(screen.getByRole('button', { name: /approvals/i }));
    expect(useStore.getState().view).toBe('home');
  });
});
