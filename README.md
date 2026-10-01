# Approvals AI Assistant — Crystal Ball Wave 2

OomniEye "Approvals" panel rebuilt as a working web app. Five AI-backed entry points, deterministic fallbacks, TDD commit history.

---

## Prerequisites

- Node.js 20+
- An Anthropic API key

---

## Setup

```bash
# 1. Install all workspace dependencies from repo root
npm install

# 2. Create the API env file
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env and set ANTHROPIC_API_KEY=sk-ant-...

# 3. Start both servers (runs api on :3001 and web on :3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Running tests

```bash
# API tests (Jest + Supertest)
cd apps/api && npm test

# Web tests (Vitest + Testing Library)
cd apps/web && npm test
```

---

## Simulating failures (for reviewers)

Set `LLM_SIMULATE` in `apps/api/.env` before starting the server:

| Value | What happens |
|---|---|
| `timeout` | Every LLM call times out after 8 s → fallback shown |
| `error` | Every LLM call throws a 500 error → fallback shown |
| `malformed` | Summary tool-use returns invalid JSON → fallback shown |

```env
LLM_SIMULATE=timeout
```

Restart `apps/api` after changing the value. The UI will display "AI unavailable — showing standard guidance" on every card.

---

## Architecture

```
apps/api/          Express + TypeScript strict, port 3001
  src/prompts/     Versioned prompt exports (*.v1.ts). No inline prompt strings elsewhere.
  src/services/    llm.ts, summary.ts, chat.ts, help.ts, teach.ts, greeting.ts,
                   retrieval.ts, fallback.ts
  src/routes/      Thin handlers: Zod validate → service → SSE stream
  src/data/        approvals.fixture.json, policy.md

apps/web/          Next.js 14 App Router + React + TypeScript strict, port 3000
  src/components/  Panel.tsx, SummaryCard, ChatCard, HelpCard, TeachCard, GreetingBanner
  src/store/       Zustand — sessionId, view, messages, status, greetingText, helpSources
  src/lib/         sse-client.ts (fetch + ReadableStream, not EventSource)

packages/contracts/  Zod schemas shared by api and web
```

### Key decisions

**SSE over POST, not EventSource** — `EventSource` only supports GET and cannot send headers (needed for `X-Session-Id`). We use `fetch` + `ReadableStream` instead (see `sse-client.ts`).

**Tool use for Summary structured output** — The summary endpoint uses Anthropic's forced `tool_choice` to get validated JSON (`headline`, `priorities[]`). This is more reliable than regex-parsing free text. Invalid shape falls back immediately.

**Keyword retrieval for Help me** — Token-overlap scoring with stopword removal and prefix matching handles plurals (video/videos). No embeddings or vector DB needed for a 4-chunk policy file.

**Dependency-injected LLM client** — `createApp({ llm, timeoutMs, rateLimit })` accepts the LLM client as a parameter so tests inject a mock without mocking modules.

**Retry policy** — One retry only for transient errors (429/5xx/network) when time budget allows. Timeouts are never retried — retrying a timed-out call would double the user wait with low probability of success.

---

## Assumptions

1. **No urgency field in the fixture.** Urgency is AI-inferred from item title/type + policy context. Displayed as "AI-assessed priority" in the UI, not as authoritative workflow state.

2. **Language parameter.** "In the operator's language" is ambiguous. Request body carries `language: "en" | "hi"`, default `en`. Summary, Chat and Teach answer in the requested language. Not a full i18n feature.

3. **"Out loud."** Implemented as text only. Browser `speechSynthesis` is a stretch goal not required by the assignment.

4. **Five entry points vs screenshot.** The screenshot shows four feature cards plus a "Replay Greeting" link in the sub-bar. Built exactly that — not five separate full-page cards.

5. **Footer count.** Screenshot says "26 folders / items" but the fixture has 4 items. Footer shows the fixture count (4).

6. **Dates.** Approval dates are stored and displayed as "Sep 18" with no year, matching the fixture exactly.

---

## Fallback design

Every AI failure (timeout, 4xx/5xx, network error, malformed output, Zod validation failure) produces a deterministic fallback — never a raw 500 and never a frozen UI.

| Feature | Fallback |
|---|---|
| Summary | "4 approvals pending review" + queue sorted safety-first, then by type |
| Talk | Chat unavailable message + full queue list |
| Help | Retrieved policy chunks shown verbatim with "AI unavailable" note; "policy doesn't specify this" when no chunks match |
| Teach | Static 6-step review workflow |
| Greeting | `You have N approvals waiting for review.` |

**AI-unnecessary rule:** if a deterministic answer is reliable (e.g. Help with zero retrieved chunks), the LLM is not called at all.

---

## AI tools used

- **Claude (claude.ai / Claude Code)** — used throughout development for: scaffolding TypeScript monorepo boilerplate, drafting Zod schemas, generating test skeletons, debugging SSE parsing edge cases, writing prompt templates, and reviewing TypeScript strict-mode errors. All generated code was reviewed, tested, and committed under the TDD protocol (failing test commit first, then implementation).

---

## Personal reflection

AI-necessary vs AI-unnecessary

Summary and Teach me genuinely need the LLM — urgency prioritisation requires reasoning over item titles and policy context that no deterministic rule captures reliably, and Teach me needs to adapt its explanation based on follow-up questions. Talk to me benefits from AI for natural conversation but could answer simple questions ("which items are pending?") without it. Help me is interesting — the retrieval is entirely deterministic keyword matching, and if no chunks are found the LLM is never called at all; the AI only adds value when relevant policy exists. Replay Greeting is the weakest case for AI — a template covers 90% of the value, but the LLM adds a personal, context-aware tone.


Every LLM call has an 8-second AbortController timeout. Timeouts are never retried (retrying doubles the wait with low success probability). Transient errors (429/5xx) get one retry. Every failure class maps to a deterministic fallback — the UI always responds, never freezes.

One thing I'd do differently

I'd add real semantic chunking with embeddings for the Help me RAG instead of keyword overlap — the current retrieval misses paraphrased questions. With more time I'd also add a proper conversation memory summary so long Talk to me sessions don't bloat the context window.

---

## License

MIT
