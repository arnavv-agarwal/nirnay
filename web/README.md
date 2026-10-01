# Nirnay web app

The front end of Nirnay: Next.js (React, TypeScript) with hand-written CSS modules in PW's design language (Reddit Sans, PW purple; see `../DESIGN.md`). It talks to the FastAPI server in `../server/`.

```bash
npm install
npm run dev          # http://localhost:3000, expects the API on http://localhost:8000
npm run build        # production build (what Vercel runs)
npm run lint
```

Set `NEXT_PUBLIC_API_URL` to point at a deployed API (see `../DEPLOY.md`); it defaults to `http://localhost:8000`.

## Where things are

| Path | What it is |
|---|---|
| `app/page.tsx` | **Inbox** for agents: queue, conversation, triage panel; send & next with undo |
| `app/quality/page.tsx` | **Quality** for the team lead: accuracy, threshold trade-off chart, per-topic results, live inbox signals, corrections |
| `app/knowledge/page.tsx` | **Knowledge base**: every article Nirnay may cite, with its source |
| `components/inbox/` | `TicketList` (queues, search, notices), `QueueControls` (sort and filters), `Conversation` (messages, composer), `TriagePanel` (why it needs you, facts, details, help articles), `NewTicket` |
| `components/quality/` | `ThresholdChart`, `ResultsTable` |
| `components/` | `Sidebar`, `Tag` (status, risk and confidence tags), `Logo`, `SettingsProvider` (threshold and model, shared by all pages) |
| `lib/api.ts` | Types and calls for the API |
| `lib/queue.ts` | Queue logic: which tickets show, sorting, filters and their counts |
| `lib/trends.ts` | Batch and centre names per ticket, and patterns (3+ tickets in a day) |
| `lib/labels.ts` | Plain-word labels: topics, statuses, reasons, confidence as High / Medium / Low |
| `app/globals.css` | Design tokens (colours, type, spacing) and shared button and tag styles |
