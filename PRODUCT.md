# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (React, TypeScript) front end talking to a FastAPI (Python) back end. The triage logic stays in the existing Python package `triage/`; FastAPI exposes it as an API. Chosen by the user for full control over the design language. Streamlit was rejected for that reason.

## Users

- **Primary: PW support agents** working the support inbox on a laptop or desktop during a shift. Their job: clear incoming student tickets (WhatsApp, email, web form; English, Hinglish, Hindi), send accurate replies, and personally handle anything involving money, account changes, anger or distress.
- **Secondary: the support team lead**, who decides how much Nirnay may auto-send. Their job: check that accuracy holds, set the confidence threshold, and watch the auto-reply rate against missed escalations.
- **Evaluators** (PW's Central AI team) see Nirnay as a working internal tool, and look inside a ticket to see how each decision was made.

## Product Purpose

Nirnay (निर्णय, "decision") reads every incoming student ticket, labels what it is about (refund, batch access, payment, technical, academic doubt, other), drafts a reply grounded in PW's help articles with a citation on every claim, and makes one decision: **send automatically, or hand to a person**, always with its reasons. Success means routine tickets are answered in seconds, while every ticket that needs a human (money, account changes, an angry or distressed student) reaches one, urgent ones first.

## Positioning

The decision is the product. Nirnay never hides behind a chatbot: every ticket shows its topic, sentiment and language (confidence as High / Medium / Low for agents; exact numbers for the team lead), the help articles it used, whether its citations checked out, and in plain words why it came to a person. Agents can correct a wrong topic, and each correction becomes new labelled data. The escalation rule is plain, auditable code the team lead can tune, not a model's mood. Numbers from a held-out labelled test set back every claim about accuracy.

## Operating Context

- Tickets arrive continuously; agents work a queue, urgent first.
- Replies are drafted in the student's own language and register (Hinglish stays Hinglish).
- Subject doubts are not answered by support; they are routed to PW's AI Guru.
- The confidence threshold is a live operating control: raising it sends more to people.
- PW publicly states AI-led cost reduction in operations and counselling is a focus for FY27 (see research/pw-research.md in the workspace).

## Capabilities and Constraints

- Pipeline: clean (mask phones/emails) → classify (model) → pick help articles by topic and named PW programme, ranked by word overlap with the ticket (plain code) → draft reply with [ARTICLE-ID] citations (model) → verify citations (plain code) → decide (plain-code rule) → finish: extract order IDs/UTRs/amounts/batches, write the acknowledgement or footer, and turn [IDs] into numbered sources for the student (plain code).
- Escalation rule: at-risk student OR needs account/payment action OR category "other" OR confidence below threshold OR citation check failed OR the AI call failed OR the student already wrote within 7 days. At-risk escalations, and a third message in 7 days, are urgent.
- If the model fails (timeout, invalid output, refusal), the ticket goes to a person, classified by the keyword baseline. Nothing is auto-sent on failure.
- Models: Claude Opus 5.5 / Sonnet 5.5 / Haiku 4.5 via the Anthropic API; a keyword-only baseline needs no key.
- Knowledge base: 13 documents, 81 articles (57 official PW policy, each with its PW source; the rest labelled as public information or assumed for the prototype).
- Inbox workflow: queues (Needs you / Auto-resolved / Resolved), sort and multi-filters (topic, flags, batch or centre, channel, language), batch patterns (3+ tickets in a day), send & next with a 5-second undo, repeat-contact history, extracted details with copy, Insert into reply / Cite.
- Public demo limits: 10 new tickets a minute per visitor; 100 AI triages a day, then keyword mode.
- Terminology: "ticket", "escalate", "auto-reply", "at risk", "needs action", "help article", "citation", "confidence threshold".
- Batch schedules (start dates, timings, prices) are deliberately not in the knowledge base: they change with every launch. Articles point students to the batch page; live details would come from PW's batch catalogue.
- Hosting: web app on Vercel, API on Hugging Face Spaces (Docker); steps in DEPLOY.md.

## Brand Commitments

- Name: **Nirnay** (Devanagari: निर्णय). Used in the UI, README, deck and video.
- **Visual language is PW's own design system** (user decision, 30 Sep 2026), taken from pw.live's production CSS: Reddit Sans; PW purple `#5A4BDA` with its 50–900 scale; text `#1B2124`/`#3D3D3D`; surfaces white and `#F8F8F8`; borders `#EAECEF`/`#D9DCE1`; semantic success `#1B7938`, error `#BF2734`, warning `#EAAA2E` (amber text uses PW's darker `#9F741F` for contrast); 8px radius, pill tags. It should look like a shippable internal PW tool that real support staff would use all day: professional, not themed or metaphorical.
- PW's **logo is not used**; the UI carries a small "Built for PW Support · Prototype" line. Never imply this is an official PW product.
- Category bar: Zendesk Agent Workspace, Intercom Inbox, Freshdesk. Match their clarity and density.

## Evidence on Hand

- `kb/`: 81 help articles in 13 documents, each with a source line (`kb/SOURCES.md`).
- `data/tickets.jsonl`: 156 synthetic, hand-labelled tickets (56 tuning, 100 held-out test), modelled on public PW complaint themes, labelled by a guide written first (`data/LABELING.md`). Labelled synthetic wherever shown. A blind set written without seeing the prompts is in progress.
- `eval/results/`: saved evaluation runs for keywords, Haiku 4.5, Sonnet 5.5 and Opus 5.5 on the tuning, held-out and blind sets (default: Opus 5.5, threshold 0.80).
- Absent, and must not be fabricated: real PW ticket volumes, real resolution times, real customer quotes, PW endorsement, production usage.

## Product Principles

1. **Show the decision and its reasons.** Every ticket answers: what is it, what did Nirnay do, and why.
2. **Fail toward a person.** Any doubt, error or risk routes to a human; silence is never the failure mode.
3. **Grounded or silent.** A reply states only what a cited help article says, and the student can see which article.
4. **Measured, not asserted.** Accuracy claims come from the held-out test set, shown with their failures.
5. **The student's language, the agent's speed.** Replies match the student's register; the agent's view is scannable at a glance.

## Accessibility & Inclusion

WCAG 2.2 AA contrast and keyboard operation for the agent workflow. Must render Devanagari (Hindi) and Roman Hinglish cleanly, side by side with English.
