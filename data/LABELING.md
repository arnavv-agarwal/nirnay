# Labelling Guide

Every ticket in `tickets.jsonl` was labelled by these rules. The rules were written **before** the tickets, so the labels don't bend to fit what the model does.

## Fields

| Field | Meaning |
|---|---|
| `id` | `dev-NN` or `test-NN` |
| `split` | `dev` = used while tuning prompts. `test` = held out; only scored, never used for tuning. |
| `channel` | `whatsapp`, `email` or `form` |
| `language` | `en`, `hinglish` or `hi` (Devanagari Hindi) |
| `text` | The ticket as the student wrote it |
| `categories` | One or more of the categories below |
| `needs_human_action` | The fix needs someone to look up or change the student's account, payment, order or batch |
| `at_risk` | The student is angry, threatening to escalate, repeating an unresolved complaint, or in distress |
| `should_escalate` | Ground-truth decision (rule below) |
| `note` | Why the labels are what they are |

## Categories

| Category | Covers |
|---|---|
| `refund` | Refund requests or questions, cancellations, batch change/transfer, damaged book replacement |
| `batch_access` | Batch missing, validity/expiry, blocked account, device limits, finding content, offline-centre linking |
| `payment` | Payment failures, double charges, payment methods, EMI, invoices, coupons, fake payment requests |
| `technical` | App crashes, OTP, video playback, downloads, test submission problems |
| `academic_doubt` | Subject questions, and how to ask doubts |
| `other` | Anything else: feedback, course advice, centre locations, book delivery, distress with no service issue |

A ticket about two things gets both categories. When the student picked the wrong "Issue type" on a form, label what the ticket is actually about.

## Escalation rule

```
should_escalate = needs_human_action OR at_risk OR "other" in categories
```

- **needs_human_action is true** for: refund requests (not refund *questions*), batch-change requests, duplicate charges, a batch still missing after payment when the self-help wait has passed or the student has already tried, blocked accounts, validity extensions, invoice corrections, checking whether a test attempt was saved, offline-centre linking, damaged books, and reports of fraud in PW's name.
- **needs_human_action is false** when the knowledge base fully answers the ticket and the student can act on it alone: policy questions, OTP and playback fixes, where to find things, a payment that failed and will auto-reverse, a batch bought minutes ago.
- **at_risk is true** for: anger (caps, abuse, "worst"), threats (consumer court, legal notice, social media), repeated unresolved complaints ("third time"), and distress (hopelessness, crying, wanting to give up).
- **`other` always escalates**: the knowledge base doesn't cover it, so a person should decide.

At run time the system adds two more reasons to escalate that aren't ground-truth labels: low classifier confidence, and a drafted reply whose citations can't be verified.

## Version 2: areas added with the expanded knowledge base

Written on 30 Sep 2026, **before** the 96 v2 tickets (`dev-21`–`dev-56` and `test-41`–`test-100`). The categories and the escalation rule above are unchanged. The brief defines five support categories, and anything outside them is `other`, so a person decides, now with a draft ready from the larger knowledge base. The table fixes where each new kind of ticket goes, so labels follow the rule rather than gut feel.

| Area | Kind of ticket | Category | needs_human_action |
|---|---|---|---|
| PW Store (books) | "When will my order arrive?", delivery charges, tracking | `other` | false, unless the order is overdue (more than 5 working days after dispatch, or the student says it's late): then true |
| | Damaged, missing or wrong books | `refund` | true (a replacement or refund order is raised) |
| | Cancel an order before it ships | `refund` | true |
| | Asking to change the delivery address | `other` | true |
| Offline centres (Vidyapeeth / Pathshala) | Seat booking, fee instalments, EMI for centre fees | `payment` | false for questions; true if a payment is disputed |
| | Batch allotment, PW app access for an offline batch, ID card | `batch_access` | true if it's overdue (app access more than 48 hours after allotment) or a card is lost; false for "when/where" questions |
| | Withdrawal, refund of fees or security deposit | `refund` | true for requests; false for "what is the policy" questions |
| | Transfer to another centre, or Pathshala ↔ Vidyapeeth | `refund` (it's a batch change) | true for requests |
| | Centre locations, timings, which centre to join | `other` | false |
| Scholarships (PWNSAT) | Dates, eligibility, pattern, how to register | `other` | false |
| | Scholarship not applied to the fee | `payment` | true |
| | Refund of the PWNSAT fee | `refund` | true for requests |
| PW Skills | Paid but no course access | `batch_access` | true |
| | Refund request (any timing) | `refund` | true |
| | Certificate won't generate after meeting the requirements; assignment not updated | `technical` | true |
| | "How do I get my certificate?", "where are recordings?", "is there an app?" | `technical` | false |
| | Pausing the programme | `batch_access` | true |
| | Job assistance, placement promises | `other` | false for questions; complaints about a promised job are also `refund` if they ask for money back |
| PW OnlyIAS | Refund or seat-booking questions and requests | `refund` | true for requests; false for questions |
| Account and privacy | Delete account, stop promotional messages, data or privacy concerns, use of photos in ads | `other` | false for how-to; true for privacy complaints and objections |
| | Change the registered mobile number | `batch_access` | true |
| | "Someone else is using my account" | `batch_access` | true (and `at_risk` only if the student is upset, not by default) |
| Exams | Admit cards, results, exam registration (PW doesn't handle these) | `other` | false |

## Version 3 note (1 Oct 2026): joining a batch

Added with the two "Joining a batch" articles (JB-1, JB-2). No existing label changes.

| Kind of ticket | Category | needs_human_action |
|---|---|---|
| Before buying: batch details, timetable, start, demo lectures, "which batch should I join" | `other` | false |
| Joining a batch that has already started (will I get the old lectures?) | `other`, or `batch_access` if they already bought it | false |
| Moving to a later or different batch after buying | `refund` (it's a batch change) | true |
| Asking to extend validity because they joined late | `batch_access` | true |
