import type { Category, Channel, Status, Ticket } from "./api";
import { TOPICS } from "./labels";
import { subjectsOf } from "./trends";

// How the inbox list is chosen, filtered and ordered. Plain functions, no UI.

// ---------- Queues ----------

export type View = "needs_you" | "auto_sent" | "resolved" | "all";

// "all" is used while searching: search looks across every queue, as in most helpdesks.
export const VIEWS: { id: View; label: string }[] = [
  { id: "needs_you", label: "Needs you" },
  { id: "auto_sent", label: "Auto-resolved" },
  { id: "resolved", label: "Resolved" },
];

export function inView(view: View, status: Status): boolean {
  if (view === "all") return true;
  if (view === "needs_you") return status === "urgent" || status === "needs_review";
  return status === view;
}

const isOpen = (t: Ticket) => t.status === "urgent" || t.status === "needs_review";

// The agent's correction, when there is one, beats the AI's topics.
export function topicsOf(t: Ticket): Category[] {
  return t.corrected_categories ?? t.result.classification.issues.map((i) => i.category);
}

// ---------- Sorting ----------

export type Sort = "urgency" | "newest" | "oldest" | "topic";

export const SORTS: { id: Sort; label: string }[] = [
  { id: "urgency", label: "Most urgent first" },
  { id: "oldest", label: "Oldest first" },
  { id: "newest", label: "Newest first" },
  { id: "topic", label: "By main topic" },
];

// Work queues are worked urgent first, then whoever has waited longest. History reads newest first.
export const defaultSort = (view: View): Sort => (view === "needs_you" || view === "all" ? "urgency" : "newest");

const STATUS_RANK: Record<Status, number> = { urgent: 0, needs_review: 1, auto_sent: 2, resolved: 3 };
const TOPIC_RANK = Object.fromEntries(TOPICS.map((t, i) => [t.id, i])) as Record<Category, number>;
const oldestFirst = (a: Ticket, b: Ticket) => a.received_at.localeCompare(b.received_at);
const newestFirst = (a: Ticket, b: Ticket) => b.received_at.localeCompare(a.received_at);

// Urgent, then needs you, then closed. Within open tickets: upset students, then students
// who wrote again, then the longest wait. Closed tickets: most recent first.
function byUrgency(a: Ticket, b: Ticket): number {
  return STATUS_RANK[a.status] - STATUS_RANK[b.status]
    || Number(b.result.classification.at_risk) - Number(a.result.classification.at_risk)
    || b.prior_contacts - a.prior_contacts
    || (isOpen(a) ? oldestFirst(a, b) : newestFirst(a, b));
}

export function sortTickets(tickets: Ticket[], sort: Sort): Ticket[] {
  const compare = {
    urgency: byUrgency,
    newest: newestFirst,
    oldest: oldestFirst,
    topic: (a: Ticket, b: Ticket) => TOPIC_RANK[topicsOf(a)[0]] - TOPIC_RANK[topicsOf(b)[0]] || byUrgency(a, b),
  }[sort];
  return [...tickets].sort(compare);
}

// ---------- Filters ----------

export type Flag = "urgent" | "upset" | "account_change" | "repeat";

export interface Filters {
  topics: Category[];
  flags: Flag[];
  batches: string[];                 // batch or centre names, e.g. "Lakshya NEET", "Kota centre"
  channels: Channel[];
  languages: ("en" | "hinglish" | "hi")[];
}

export const NO_FILTERS: Filters = { topics: [], flags: [], batches: [], channels: [], languages: [] };

export type FilterGroup = keyof Filters;

// What the filter panel offers, in order. Options in a group combine with OR; groups with AND.
// The batch-or-centre group is built from the tickets themselves (batchOptions below).
export const FILTER_OPTIONS: { group: FilterGroup; title: string; options: { id: string; label: string }[] }[] = [
  { group: "topics", title: "Topic", options: TOPICS.map((t) => ({ id: t.id, label: t.label })) },
  { group: "flags", title: "Needs attention", options: [
    { id: "urgent", label: "Urgent" },
    { id: "upset", label: "Upset or at risk" },
    { id: "account_change", label: "Account change needed" },
    { id: "repeat", label: "Wrote again this week" },
  ] },
  { group: "channels", title: "Channel", options: [
    { id: "whatsapp", label: "WhatsApp" }, { id: "email", label: "Email" }, { id: "form", label: "Web form" },
  ] },
  { group: "languages", title: "Language", options: [
    { id: "en", label: "English" }, { id: "hinglish", label: "Hinglish" }, { id: "hi", label: "Hindi" },
  ] },
];

function hasFlag(t: Ticket, flag: Flag): boolean {
  const c = t.result.classification;
  if (flag === "urgent") return t.status === "urgent";
  if (flag === "upset") return c.at_risk;
  if (flag === "account_change") return c.needs_human_action;
  return t.prior_contacts > 0;
}

function matchesOption(t: Ticket, group: FilterGroup, id: string): boolean {
  if (group === "topics") return topicsOf(t).includes(id as Category);
  if (group === "flags") return hasFlag(t, id as Flag);
  if (group === "batches") return subjectsOf(t).includes(id);
  if (group === "channels") return t.channel === id;
  return t.result.classification.language === id;
}

export function matchesFilters(t: Ticket, f: Filters): boolean {
  return (Object.keys(f) as FilterGroup[]).every(
    (group) => f[group].length === 0 || (f[group] as string[]).some((id) => matchesOption(t, group, id)));
}

export function countMatching(tickets: Ticket[], group: FilterGroup, id: string): number {
  return tickets.filter((t) => matchesOption(t, group, id)).length;
}

export const activeFilterCount = (f: Filters) => Object.values(f).reduce((n, ids) => n + ids.length, 0);

export function toggleFilter(f: Filters, group: FilterGroup, id: string): Filters {
  const ids = f[group] as string[];
  return { ...f, [group]: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] };
}

export function optionLabel(group: FilterGroup, id: string): string {
  if (group === "batches") return id;
  return FILTER_OPTIONS.find((g) => g.group === group)?.options.find((o) => o.id === id)?.label ?? id;
}

// Every batch or centre named in the inbox, marking patterns (3+ tickets in a day, lib/trends.ts).
// The filter panel orders them by the counts it shows.
export function batchOptions(tickets: Ticket[], patterns: string[]): { id: string; label: string; pattern: boolean }[] {
  const counts = new Map<string, number>();
  for (const t of tickets) for (const s of subjectsOf(t)) counts.set(s, (counts.get(s) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => Number(patterns.includes(b[0])) - Number(patterns.includes(a[0])) || b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id]) => ({ id, label: id, pattern: patterns.includes(id) }));
}
