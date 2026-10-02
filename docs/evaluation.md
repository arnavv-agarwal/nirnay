# Evaluation: how Nirnay was tested, and where it fails

The front page is the [README](../README.md).

## How it was tested

**Test data.** No tickets were provided, so I wrote 156 synthetic tickets modelled on PW's public complaint themes. They cover every area of the knowledge base: online batches, payments, the app, doubts, PW Store orders, Vidyapeeth/Pathshala centres, PWNSAT, PW Skills, PW OnlyIAS, account and privacy, and exam questions PW doesn't handle. They include:
- a mix of English, Hinglish and Hindi, across WhatsApp, email and web-form styles;
- typos, wrong "Issue type" fields, and 17 tickets with several issues;
- 16 angry, threatening or distressed students.

They are split into **56 tuning** and **100 held-out test** tickets, plus a separate **blind set of 15** written by Arnav without seeing the prompts, keyword lists or existing tickets (`data/blind_tickets.jsonl`). Every topic has at least 8 held-out examples. Labels (topics, needs-account-action, at-risk, should-escalate) follow a guide written *before* the tickets (`data/LABELING.md`). The escalation label is derived from the written rule, and a script checks every label is consistent with it.

**Metrics.** `python -m eval.run_eval --model <model> --split <dev|test|blind>` reports:
- routing accuracy, escalation precision/recall, and missed vs unneeded escalations;
- per-topic precision/recall;
- at-risk and needs-action detection;
- citation-check pass rate;
- cost per ticket and p95 latency;
- a threshold sweep.

The saved predictions let the threshold be re-scored without new API calls.

**Robustness.** `python -m eval.robustness --model <model>` runs 9 hostile or messy inputs, each with a rule the result must obey:
- prompt injection in English and Hinglish must escalate;
- emoji-only anger and gibberish must go to a person;
- phone numbers and emails must never reach the model;
- a very long message must be handled;
- distress with no service issue must be urgent;
- a message with three issues must get at least two topics;
- a draft must never promise a refund.

Haiku, Sonnet and Opus: **9/9**. Keyword baseline: 8/9 (it escalates the distressed student, but at normal priority, because "giving up" isn't in its keyword list; the AI catches it).

**Unit tests.** `python -m pytest` (30 tests, under a second, no API key or network): every branch of the escalation rule including the confidence boundary and repeat contacts, the citation check, phone/email masking, detail extraction, article routing and ranking, student-facing sources, removing follow-up promises from automatic replies (English, Hinglish, Hindi), the "Joining a batch" routing, and the API end to end on a throwaway database (a refund demand always reaches a person, repeat contacts, empty input rejected, the rate limit, a new threshold never moving answered tickets, reopening an automatic reply, a HEAD request from an uptime monitor, a ticket answered only once).

**End-to-end.** A browser test runs these flows against the real app: new ticket → triage → correct topic → cite → send (next ticket opens; Undo restores it; it really sends after 5s); cross-queue search; filters and sort; keyboard navigation; applying a threshold (existing tickets don't move); reopening an automatic reply; the results filter; a ticket list that arrives late (read before the agent acted) not undoing what they did; knowledge-base search. A second suite checks the reply box: empty by default, Use Nirnay's draft, edited label, drafts kept across tickets, Hindi drafts, and a new ticket through the real AI (about 10 seconds). Two more cover real use across devices: `phone.py` (sending on a phone: confirmation, Undo, switching apps inside the undo window; in Chromium, WebKit and Firefox) and `two_devices.py` (a phone and a laptop on one inbox for several rounds: what one does, the other sees, and a ticket can't be answered twice). All four suites pass locally and on the live site.

## How the prompts were tuned

All tuning used only the 56 tuning tickets, on Haiku (cheapest), in three rounds. Every change brought the prompts in line with the written labelling guide rather than with particular tickets: the per-programme rules (PW Store, Vidyapeeth, PWNSAT, PW Skills, OnlyIAS, account), "a double charge is payment *and* refund", "a policy question goes in the same topic as a request about it", "always cite at least one article", and, in code, giving the drafter the articles that its chosen articles refer to. Haiku on the tuning set went 89% → 88% → **93%** routing, 75% → 82% → **89%** topics. Then the prompts were **frozen**: the 100 held-out tickets and the 15 blind tickets were each run once per model, with no changes afterwards.

## Results

Routing accuracy = the auto-reply-or-person decision was right. Missed = needed a person, got an auto-reply (the costly error). Scored at threshold 0.70; the shipped 0.80 gives the same held-out recall and precision for Opus.

**Held-out test (100 tickets, never used for tuning)**

| Model | Routing | Missed | Unneeded | Escalation recall / precision | Topic accuracy | Upset caught | Cost / ticket | p95 latency |
|---|---|---|---|---|---|---|---|---|
| Keywords only | 78% | 15 | 7 | 78% / 88% | 66% | 6/10 | $0 | – |
| Claude Haiku 4.5 | 93% | 2 | 5 | 97% / 93% | 84% | 10/10 | $0.006 | 8.0s |
| Claude Sonnet 5.5 | 92% | 3 | 5 | 96% / 93% | 91% | 10/10 | $0.016 | 9.0s |
| **Claude Opus 5.5 (default)** | **96%** | **2** | **2** | **97% / 97%** | **91%** | **10/10** | $0.033 | 14.8s |

**Blind set (15 tickets written by Arnav without seeing the prompts, keyword lists or existing tickets)**

| Model | Routing | Missed | Unneeded | Topic accuracy | Upset caught |
|---|---|---|---|---|---|
| Keywords only | 67% | 4 | 1 | 47% | 3/7 |
| Claude Haiku 4.5 | 80% | 1 | 2 | 60% | 4/7 |
| Claude Sonnet 5.5 | 67% | 3 | 2 | 67% | 3/7 |
| Claude Opus 5.5 | 73% | 2 | 2 | 67% | 4/7 |

Tuning set (56): keywords 68%, Haiku 93%, Sonnet 98%, Opus 98% routing. Robustness: **9/9 on all three models** (keywords 8/9). Citation check: 100% pass on the held-out set for every model. Model errors: 0.

**Choosing the default: Claude Opus 5.5.** Across all 115 unseen tickets (held-out + blind) it routes best (93%), sends the fewest tickets to people unnecessarily, and caught a fraud report ("a caller asked for my OTP to activate my batch") that Haiku auto-answered. Sonnet is beaten by one or the other on every measure. **Haiku is the cost option** for PW's full volume: 5× cheaper and nearly as accurate (at 10,000 tickets a day, about $60 instead of $325). The natural next step is both: Haiku first, Opus when Haiku is unsure.

**Choosing the threshold: 0.80**, from the tuning set: raising it from 0.70 caught the one remaining missed escalation (recall 97% → 100%) for a small loss of precision (100% → 97%), and it sits in the middle of a flat 0.75–0.85 range. On the held-out set it changes nothing (97% / 97%).

## Reply quality: are the drafts true to their sources?

Routing accuracy and the citation check don't say whether a reply is *right*. `eval/reply_quality.py` has a different model (Claude Sonnet 5.5) judge every one of Opus's 100 held-out drafts: it splits each reply into factual claims and checks each against the full text of the articles the reply cites, then checks the language and whether the reply promises anything the articles don't. Cost: $0.56.

| Measure | Result |
|---|---|
| Factual claims supported by the cited articles | **93%** (6% partly: a detail added or changed; **1.5%**, 8 of 536, not supported) |
| Same language as the ticket | **100%** |
| Promises a refund, extension or exception the articles don't state | **0** |
| "A support agent will follow up" lines (instructed by the prompt when articles don't answer) | 76 of 612 claims; the strict judge counts them unsupported, which is why "every claim supported" is only 45% of replies |

The 8 unsupported facts are small inventions such as "your Full Stack course is Premium" or "support has noted your UTR". **Checking the judge against a person.** Arnav graded 20 of these replies by hand (automatic replies and drafts, including three with follow-up promises), independently of the judge, as a support agent would: do the facts match the cited articles, does it answer the student, right language, would you send it. `python -m eval.judge_agreement` compares the two (grades in `eval/results/reply_quality/human_grades.json`):

| | Same verdict | Where they differ |
|---|---|---|
| Facts match the articles | 13 of 20 | the judge is stricter every time |
| Answers the student | 13 of 20 | the judge is stricter every time |
| Right language | 20 of 20 | |

The judge was stricter on 11 replies and **never more lenient** than the person, so its 93% is a cautious figure: the true share of supported facts is likely higher. Each side catches something the other misses: the judge flags small added details a person reading at speed lets through (test-95's "support has noted your UTR", which nobody did); the person flags a cited article that is beside the point (TS-2 in test-17, SK-6 in test-72), which the judge doesn't count against the reply. As an agent, Arnav would send 18 of the 20 as written and 2 after edits, none not at all.

**One real flaw it found:** 4 of the 33 automatic replies (12%) tell the student "a support agent will follow up", but an automatic reply never reaches an agent, so that follow-up never happens. It was found after the prompts were frozen, and it then happened on the live demo. Fixed in plain code without touching the prompts, so the held-out routing score is unchanged: before an automatic reply is sent, `rules.without_follow_up_promises` drops every sentence that cites the "When a support agent takes over" article or promises a follow-up (English, Hinglish, Hindi). Checked on the saved drafts: held-out 4 → 0, blind 2 → 0, tuning 6 → 0; the phrase pattern matched nothing else in any saved automatic reply from the three models. The cost: a dropped sentence sometimes also carried a "Contact us" tip.

**How much rests on assumed articles:** 76% of held-out drafts cite at least one article that is an assumed procedure rather than PW's published policy; the most-cited article of all (CT-3, "When a support agent takes over") is one. The UI flags these, but if an assumption is wrong it is wrong in many replies at once.

## What the confidence threshold really does

Opus's self-reported confidence clusters between 0.85 and 0.97, and only 2 of 100 held-out tickets went to a person purely for low confidence: the written rules (upset, needs an account change, out of scope, failed citations, repeat contact) carry the decision. The threshold is a safety net, and the trade-off curve is flat between 0.50 and 0.85. 0.80 was chosen on the tuning set, where it caught one extra escalation.

## Where it fails

- **The blind set is harder than our own tickets** (Opus 96% held-out, 73% blind). Most of the gap is one disagreement: what counts as "upset". The labelling guide (and so the prompt) means anger, threats, a repeated complaint or distress; the blind author also counts urgency and pleading ("help kar do plej", "asap!!!!", "it's important, my test is in 2 days"). Those tickets got a correct how-to reply but not priority. A real team would settle this definition with PW's support leads before going live.
- **Pausing a PW Skills course** was missed by all three models: the prompt says pausing is "batch access" but not that the request needs a person (the labelling guide says it does). A one-line prompt fix, left unmade so the held-out score stays honest.
- **A certificate that won't generate after the requirements are met** (Sonnet, Opus) and **a lost Vidyapeeth ID card** (Sonnet) were treated as self-help.
- **"When does my batch start?" after buying** went to a person on every model, where the blind author expected an auto-reply. Start dates are deliberately not in the knowledge base, so this is the safe direction.
- **Two invoice questions** went to a person unnecessarily on Haiku (labelled "other").
- **Replies leaning on assumed articles**: see Reply quality above. (Auto-replies promising a follow-up: fixed after the evaluation, see there.)

## Known limitations, in full

- **Synthetic data.** 156 tickets; on the 100-ticket test set one ticket moves accuracy by 1 point. Real PW tickets would change the numbers.
- **Our own test set flatters the system.** The same person wrote the tuning and held-out tickets, the keyword lists and the prompts. The blind set shows the size of that effect: Opus routes 96% of our held-out tickets correctly but 73% of the blind ones (15 tickets, so each one moves the score by about 7 points). Real PW tickets would be the true test.
- **"Upset" is defined narrowly.** The prompt follows the labelling guide (anger, threats, repeated complaints, distress). A second person also counts urgency and pleading; agreeing the definition is a product decision for PW's support leads.
- **Knowledge base is partly assumed.** 57 of 81 articles are PW's official policies, drawn from pw.live, the PW Store, PW Skills and PW OnlyIAS pages, and 6 come from public product information or news. 18 are plausible support procedures PW doesn't publish (for example the 2-hour batch sync, OTP steps and joining a batch late), labelled as assumptions in the UI. Official pages also conflict in one place (the PW Skills FAQ vs its terms on refunds), which is documented in `kb/SOURCES.md`.
- **Confidence is self-reported by the model** and not calibrated. The threshold is chosen from the measured trade-off chart rather than trusted blindly.
- **Sending is simulated.** No WhatsApp or email integration; `POST /api/triage` is the integration point.
- **No auth or multi-agent assignment**, and SQLite storage. It's a prototype. On the public demo anyone can change the threshold or send replies; the inbox resets to the demo tickets whenever the server restarts.
- **Keyword mode** (no API key, or the daily AI budget spent) classifies and routes but drafts no replies.
- **Repeat contacts are matched by student name.** A real deployment would match by phone number or PW account ID; names collide.
- **Detail extraction is regex.** It knows PW's order-ID and UTR formats and a fixed list of batch and centre names; a new batch name needs adding to `triage/details.py`.
- **The "wrote back" metric** only sees messages that reach Nirnay; a student who gives up and leaves is invisible to it.

---
