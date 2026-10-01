import type { Category, Ticket } from "./api";

// Batches and centres the students name, and the ones that look like a pattern.
//
// Several students writing about the same batch or centre within a day usually share one
// cause: a batch that didn't sync, a centre notice, a delayed book dispatch. The inbox filter
// lists every batch and centre, and marks these patterns so an agent checks the cause once.
// Auto-resolved tickets count too: if Nirnay answered five students about the same missing
// batch on its own, that is exactly the pattern a person should see.
// Plain code: it uses the batch and centre names already pulled out of each message.

export const TREND_MIN = 3;                 // tickets needed before a batch counts as a pattern
const WINDOW_MS = 24 * 60 * 60 * 1000;      // "within a day"

export interface Trend { key: string; label: string; topic: Category; ids: string[]; open: number }

const UPPER = new Set(["neet", "jee", "upsc", "ias"]);
const tidy = (s: string) =>
  s.toLowerCase().split(/\s+/).map((w) => (UPPER.has(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))).join(" ");

// Every batch or centre a ticket names. "Lakshya NEET 2.0" and "lakshya neet 2026" are one batch family.
export function subjectsOf(t: Ticket): string[] {
  const names = (t.result.details ?? [])
    .filter((d) => d.kind === "Batch" || d.kind === "Centre")
    .map((d) => (d.kind === "Centre" ? `${tidy(d.value)} centre` : tidy(d.value.replace(/\s(\d\.0|20\d\d)\b/g, ""))));
  return [...new Set(names)];
}

export const isOpen = (t: Ticket) => t.status === "urgent" || t.status === "needs_review";

// "Within a day" is measured back from the newest ticket, so a long-running demo keeps its patterns.
export function trends(tickets: Ticket[]): Trend[] {
  if (tickets.length === 0) return [];
  const now = Math.max(...tickets.map((t) => new Date(t.received_at).getTime()));
  const groups = new Map<string, Ticket[]>();
  for (const t of tickets) {
    if (now - new Date(t.received_at).getTime() > WINDOW_MS) continue;
    for (const s of subjectsOf(t)) groups.set(s, [...(groups.get(s) ?? []), t]);
  }
  return [...groups.entries()]
    .filter(([, ts]) => ts.length >= TREND_MIN && ts.some(isOpen))
    .map(([label, ts]) => ({ key: label, label, topic: mostCommonTopic(ts), ids: ts.map((t) => t.id),
                             open: ts.filter(isOpen).length }))
    .sort((a, b) => b.ids.length - a.ids.length);
}

function mostCommonTopic(ts: Ticket[]): Category {
  const counts = new Map<Category, number>();
  for (const t of ts) {
    const c = t.result.classification.issues[0].category;
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
