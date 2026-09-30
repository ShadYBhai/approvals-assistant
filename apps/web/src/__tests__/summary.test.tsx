import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SummaryCard } from '../components/SummaryCard';
import { useStore } from '../store';

const enc = (s: string) => new TextEncoder().encode(s);

function makeStream(chunks: string[]) {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(c) { controller = c; },
  });
  return { body, enqueue: (s: string) => controller.enqueue(enc(s)), close: () => controller.close() };
}

beforeEach(() => {
  useStore.setState({
    sessionId: 'test-session',
    view: 'home',
    messages: [],
    status: 'idle',
    summaryData: null,
  });
  vi.restoreAllMocks();
});

describe('SummaryCard', () => {
  it('shows loading state after clicking the button', async () => {
    const { body, close } = makeStream([]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)));

    render(<SummaryCard />);
    fireEvent.click(screen.getByRole('button', { name: /present me summary/i }));

    expect(await screen.findByText(/loading/i)).toBeInTheDocument();
    close();
  });

  it('renders streamed narrative tokens progressively', async () => {
    const { body, enqueue, close } = makeStream([]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)));

    render(<SummaryCard />);
    fireEvent.click(screen.getByRole('button', { name: /present me summary/i }));

    enqueue('event: summary\ndata: {"headline":"4 approvals","priorities":[]}\n\n');
    enqueue('event: token\ndata: {"t":"Safety"}\n\n');
    expect(await screen.findByText(/Safety/)).toBeInTheDocument();

    enqueue('event: token\ndata: {"t":" items"}\n\n');
    enqueue('event: done\ndata: {"source":"ai","promptVersion":"v1"}\n\n');
    close();

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });

  it('shows fallback indicator when source is fallback', async () => {
    const { body, enqueue, close } = makeStream([]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)));

    render(<SummaryCard />);
    fireEvent.click(screen.getByRole('button', { name: /present me summary/i }));

    enqueue('event: summary\ndata: {"headline":"4 approvals","priorities":[]}\n\n');
    enqueue('event: done\ndata: {"source":"fallback","promptVersion":"fallback-v1"}\n\n');
    close();

    expect(await screen.findByText(/AI unavailable/i)).toBeInTheDocument();
  });

  it('shows error state when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    render(<SummaryCard />);
    fireEvent.click(screen.getByRole('button', { name: /present me summary/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
