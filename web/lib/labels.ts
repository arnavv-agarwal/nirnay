import type { Category, Channel, ReasonCode, Status, Ticket } from "./api";

export const TOPICS: { id: Category; label: string }[] = [
  { id: "refund", label: "Refund / batch change" },
  { id: "batch_access", label: "Batch access" },
  { id: "payment", label: "Payment" },
  { id: "technical", label: "Technical" },
  { id: "academic_doubt", label: "Academic doubt" },
  { id: "other", label: "Other" },
];

export const TOPIC_LABEL = Object.fromEntries(TOPICS.map((t) => [t.id, t.label])) as Record<Category, string>;

export const STATUS_LABEL: Record<Status, string> = {
  urgent: "Urgent",
  needs_review: "Needs you",
  auto_sent: "Auto-resolved",
  resolved: "Resolved",
};

export const CHANNEL_LABEL: Record<Channel, string> = { whatsapp: "WhatsApp", email: "Email", form: "Web form" };
export const LANGUAGE_LABEL = { en: "English", hinglish: "Hinglish", hi: "Hindi" } as const;

// Agents see confidence as a word, like Zendesk's High / Medium / Low, never as a raw number.
// "Low" is exactly "below the team's threshold", so it lines up with the escalation rule.
export type ConfidenceLevel = "High" | "Medium" | "Low";
export function confidenceLevel(confidence: number, threshold: number): ConfidenceLevel {
  if (confidence < threshold) return "Low";
  return confidence >= Math.max(0.85, threshold) ? "High" : "Medium";
}

// Why a ticket reached a person, in an agent's words. The exact specifics (the
// quoted words, the numbers) come from the decision's reasons.
export const REASON_TEXT: Record<ReasonCode, { title: string; hint: string }> = {
  at_risk: { title: "Student is upset or at risk", hint: "Reply personally and first." },
  needs_action: { title: "Needs a change to their account or payment", hint: "Nirnay can't do this; you can." },
  out_of_scope: { title: "Not covered by the help articles", hint: "Nirnay won't guess an answer." },
  low_confidence: { title: "Nirnay isn't sure what this is about", hint: "Check the topic before replying." },
  citation_failed: { title: "The draft's sources didn't check out", hint: "Review the draft carefully." },
  ai_failed: { title: "The AI step failed", hint: "Classified by keywords only; no draft." },
  repeat_contact: { title: "They've written to us before", hint: "Read their earlier message first, so they don't have to repeat themselves." },
};

export function reasonDetail(ticket: Ticket, code: ReasonCode): string | null {
  const r = ticket.result;
  if (code === "at_risk") return r.classification.at_risk_reason || null;
  if (code === "needs_action") return r.classification.needs_human_reason || null;
  if (code === "citation_failed") return r.citation_issues.join("; ") || null;
  if (code === "ai_failed") return r.error;
  if (code === "repeat_contact") return `${ordinal(ticket.prior_contacts + 1)} message in 7 days`;
  return null;
}

export function ordinal(n: number): string {
  const suffix = n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th";
  return `${n}${suffix}`;
}

export function initials(name: string): string {
  return name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
}

// "3h ago", or "just now" rather than "now ago".
export const ago = (iso: string) => { const t = timeAgo(iso); return t === "now" ? "just now" : `${t} ago`; };

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export const pct = (x: number) => `${Math.round(x * 100)}%`;

// How trustworthy an article's source is, from its "Source:" line in kb/*.md.
export type SourceKind = "official" | "product" | "reports" | "assumed";
export function sourceOf(source: string): { kind: SourceKind; label: string; url?: string } {
  const url = source.match(/https?:\/\/[^\s,;)]+/)?.[0];
  if (source.startsWith("official")) return { kind: "official", label: "Official PW policy", url };
  if (source.startsWith("public PW")) return { kind: "product", label: "Public PW product info", url };
  if (source.startsWith("public")) return { kind: "reports", label: "Public reports", url };
  return { kind: "assumed", label: "Assumed for prototype", url };
}

// Knowledge-base documents, in the order agents think about them.
export const KB_DOCS: Record<string, string> = {
  "refunds-and-cancellations": "Refunds and cancellations",
  "batch-access": "Batch access",
  "joining-a-batch": "Joining a batch",
  payments: "Payments",
  "technical-support": "Technical support",
  "doubts-and-academics": "Doubts and academics",
  "account-and-privacy": "Account and privacy",
  "pw-store-orders": "PW Store orders",
  "offline-centres": "Offline centres",
  scholarships: "Scholarships",
  "pw-skills": "PW Skills",
  "pw-onlyias": "PW OnlyIAS",
  "contact-and-escalation": "Contact and escalation",
};

// Forms arrive as "Issue type: …\nDescription: …"; emails may start with "Subject: …".
export function preview(text: string): string {
  return text.replace(/^Subject:.*\n+/, "").replace(/^Issue type:.*\nDescription:\s*/, "");
}
