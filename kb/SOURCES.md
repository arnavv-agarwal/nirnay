# Knowledge-base sources

Every article in `kb/` starts with a `Source:` line. As of 1 Oct 2026 the 81 articles in 13 documents break down as:

| Kind | Articles | Meaning |
|---|---|---|
| Official | 57 | Paraphrased from a PW page, which is linked |
| Public PW product info | 3 | PW features described publicly (AI Guru, Smart Doubt Engine, Study Sahayak) |
| Public reports | 3 | Device-login behaviour, EMI/loan news |
| Assumed | 18 | Plausible support procedures PW doesn't publish (e.g. the 2-hour batch sync, OTP steps, joining a batch late) |

## Official PW pages used (fetched 30 Sep 2026; the last row on 1 Oct 2026)

| Page | Used for |
|---|---|
| https://www.pw.live/terms-and-conditions | Refund policy, batch change (10 days), damaged books, data use, marketing opt-out, promotions consent |
| https://www.pw.live/faqs | Lakshya 2.0 transfer (15 days), free notes, counsellor missed-call number |
| https://www.pw.live/contact-us | 24x7 numbers, support email, 7-day resolution, Pathshala/Vidyapeeth transfer rules |
| https://www.pw.live/account-deletion | Deletion steps; data kept by law |
| https://www.pw.live/power-batch | Power Batch features, counsellor line |
| https://www.pw.live/test-series | Test Pass, languages, ranks, access |
| https://www.pw.live/pathshala-center-state-list | Vidyapeeth vs Pathshala, batch structure |
| PW Vidyapeeth batch page (offline-centres/…/vidyapeeth-11th-neet--target-2027) | Seat booking, admission steps, allotment, ID card, security deposit, refund policy, app access, Study > My Batches |
| https://www.pw.live/vp-blogs/exams/what-is-pwnsat | PWNSAT eligibility, dates, pattern, registration |
| https://store.pw.live/shipping-policy | Dispatch, delivery times, free shipping, non-delivery refund, damaged items |
| https://store.pw.live/terms-and-conditions | Cancelling before shipping, price changes, account security |
| https://store.pw.live/contact-us | Store support hours, courier helplines, Grievance Redressal Officer |
| https://pwskills.com/terms-and-conditions/ | PW Skills refund policy (Basic/Premium/Pro), refund process and timelines, pause, certificates |
| https://pwskills.com/faqs/ | Support times, course access, certificates, recordings, job assistance, no app |
| https://pwonlyias.com/refund-and-cancellation-policy/ | OnlyIAS offline refund policy |
| https://play.google.com/store/apps/details?id=xyz.penpencil.physicswala | Offline downloads, AI help tool, disclaimer about admit cards and results |
| https://www.pw.live/teaching/exams/how-can-you-access-demo-lectures-and-batch-details-before-enrolling | Batch page details before buying (subjects, faculty, validity, features), demo lectures, timetable in announcements, demo videos not shared on WhatsApp (JB-1, JB-2) |

## Conflicts found and how they were resolved
- **PW Skills refunds.** The FAQ says "strict no-refund policy", but the newer, detailed terms give a 30-day window for Premium/Pro courses. The KB follows the terms (SK-2) and notes the conflict.
- **Vidyapeeth refund policy.** A third-party upload of an admission form contained a named student's personal data, so it was **not** used. Only PW's own batch page is cited (OC-5).
- **Batch schedules are deliberately not in the knowledge base.** Start dates, timings, prices and seats change with every launch and would go stale; JB-1 points students to the batch page and its announcements instead. In production, live batch details would come from PW's batch catalogue, not from `kb/`.
