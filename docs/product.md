# The product, and what other tools get wrong

The front page is the [README](../README.md).

## What agents and the team lead see

- **Inbox (agents).** The standard three-pane helpdesk, kept on purpose so agents need no training: queues (Needs you / Auto-resolved / Resolved, urgent first), the conversation, and a triage panel. Where it departs from the standard is in how the queue is worked:
  - **the agent decides, Nirnay assists**: on a ticket that needs a person the reply box starts empty, with a **Use Nirnay's draft** button. The agent reads first, then starts from the draft or writes their own; the label then says whether the draft is untouched or edited. The draft is made when the ticket arrives, so the button is instant (see "Drafting" below);
  - **batch patterns**: every batch or centre a student names becomes a filter option. When 3+ tickets in a day name the same one (auto-resolved included, so a pattern the AI answered on its own is still seen), it is marked as a possible common cause, and each of those tickets says so in the triage panel with a one-click filter. The agent checks for one cause, then replies to each;
  - **send & next, with undo**: sending opens the next ticket that needs a person, as in Linear's triage inbox. The reply waits 5 seconds first ("Sending to … Undo", as in Gmail): a student can't un-receive a message, and Zendesk agents have asked for exactly this;
  - **sort and filter**: sort by most urgent (the default: urgent, then upset, then repeat contacts, then the longest wait), oldest, newest, or main topic with headings. Filter by topic, needs-attention flags (urgent, upset, account change, wrote again), batch or centre, channel and language: options in a group combine with OR, groups with AND, and every option shows exactly how many tickets it would leave. Active filters stay visible as removable chips (`web/lib/queue.ts`);
  - with the AI on, each row shows Nirnay's one-line English summary instead of the start of the message (faster to scan, and readable for Hindi tickets).

  The triage panel shows:
  - topic, mood, language, and confidence as **High / Medium / Low** (never raw numbers, as in Zendesk's intelligent triage);
  - **why this needs you** in plain words, quoting the student;
  - **the student's other messages this week**, above the conversation, so nobody asks them to repeat themselves;
  - **details in the message** (order ID, UPI/UTR reference, amount, batch, centre) with one-click copy for the admin panel;
  - the suggested help articles, best match first (show all if needed). Click one to read it, then **Insert into reply** (its text, already cited, as a starting point to edit) or **Cite** (just the reference, after the agent's own sentence). A draft that cites nothing is flagged before sending;
  - **what the student actually receives**: inside Nirnay replies cite articles by ID (`[BA-1]`), which the citation check needs; the student gets numbered references and a "Sources" list with PW's link for official policies (`triage/sources.py`), and the conversation shows that version;
  - **Topic wrong? Correct it**: each correction is saved as a new labelled example and can be exported (as with Freshdesk's Freddy);
  - **Should a person handle this? Reopen it**, on an automatic reply: the ticket goes back to Needs you for a follow-up (the sent reply stays visible), and it is recorded as "should have come to a person", the most important label for the next evaluation.
- **Quality (team lead).** Routing accuracy, missed escalations, auto-reply rate, topic accuracy and upset students caught, plus:
  - the **confidence-threshold trade-off chart** (recall / precision / auto-reply rate across every threshold), with "Use this threshold in the live inbox". A new threshold applies to new tickets: tickets already answered stay answered and tickets a person owns stay with them, so a settings change never sends a reply by itself;
  - **live inbox**: of the tickets auto-replied, how many students wrote back within 7 days (an auto-reply that didn't solve it), plus repeat contacts and agent corrections;
  - per-topic precision/recall, a model comparison, and every test ticket marked Correct / Missed / Extra.
- **Knowledge base.** Every article Nirnay may cite, with its source.

---

## What other triage tools get wrong, and what Nirnay does instead

Before adding features I read what agents and students complain about in the big helpdesks' AI (Zendesk, Intercom Fin, Freshdesk Freddy): their docs, community forums and G2 reviews. Each feature below answers one of those complaints, and none of them needs an extra AI call.

| Complaint about existing tools | Source | What Nirnay does | Rubric criterion |
|---|---|---|---|
| Agents correct a wrong intent, but the model never learns from it | [Zendesk community](https://community.zendesk.com/ideas/intelligent-triage-should-learn-from-agent-intent-corrections-21877) | Every correction (a wrong topic, or an automatic reply reopened because it should have come to a person) is stored as a labelled example, listed on the Quality page and exportable as JSONL for the next eval / prompt revision | Evaluation |
| AI answers confidently from outdated or missing content ("hallucinations") | [G2 reviews of Intercom](https://www.g2.com/products/intercom/reviews?page=9), [Fin FAQs](https://www.intercom.com/help/en/articles/7837535-fin-ai-agent-faqs) | Every sentence cites an article, code rejects unknown citations, and an uncited draft can't be auto-sent. Each article shows whether it's official PW policy or assumed | It works, Judgement |
| Hard to reach a person; the bot keeps the student in a loop | [Armatis](https://www.armatis.com/en/2026/03/10/why-your-customers-hate-repeating-themselves-and-what-its-really-costing-you/) | Money, account and distress tickets always go to a person, by a code rule the model can't override. The student is told at once that a person is on it | Product sense |
| Students repeat themselves; up to 32% of contacts are repeats | [Balto](https://www.balto.ai/blog/how-does-reducing-repeat-calls-improve-customer-experience/), [Call Centre Helper](https://www.callcentrehelper.com/ways-to-reduce-repeat-calls-253810.htm) | A second message from the same student within 7 days always goes to a person, a third is urgent, and the agent sees the earlier messages above the new one | Product sense |
| "Resolved" is counted when the customer simply stops replying | [Intercom community](https://community.intercom.com/ask-the-intercom-team-about-fin-54/fin-s-flawed-assumed-resolved-pricing-design-8929) | The Quality page counts auto-replies whose student wrote back within 7 days as **not** resolved, and lists them | Evaluation, Ownership |
| Confidence scores agents can't interpret | [Zendesk intelligent triage](https://support.zendesk.com/hc/en-us/articles/4550640560538-Automatically-classifying-customer-intent-sentiment-and-language) | High / Medium / Low with the reason in words; raw numbers only on the team lead's threshold chart | Product sense |
| AI triage needs weeks of historical tickets before it works | [eesel on Freddy](https://www.eesel.ai/blog/freshdesk-freddy-worth-it) | Works from day one on the help articles alone; no training data needed | Judgement |
| Agents retype order numbers and UTRs from the message into the admin panel | Observed in the test tickets | Order IDs, UTRs, amounts, batch and centre are pulled out by regex, with a copy button | Product sense |
| A reply sent by mistake can't be recalled | [Zendesk community idea](https://community.zendesk.com/ideas/add-an-undo-and-recall-button-to-agent-workspace-3869) | Every reply waits 5 seconds with an Undo button before it goes; Undo puts the ticket and the reply back | Product sense |
| Suggested articles unrelated to the ticket | Found in my own screenshots | Articles are chosen by topic, plus only the PW programmes the student actually names, and ranked by the words they share with the ticket | Product sense |
| Citations that mean nothing to the customer | Found while testing: a reply would have reached WhatsApp as "…[TS-1]" | The student gets numbered references and a "Sources" list with PW's link for official policies; the agent keeps the exact IDs | Product sense |
| Related tickets from one cause (a batch that didn't sync) are handled one by one; linking them is manual | [DevRev on AI triage](https://devrev.ai/blog/ai-support-ticket-triaging) | Every batch or centre named is a filter option; 3+ tickets about one in a day (including ones Nirnay auto-answered) are marked as a possible common cause | Product sense |

---
