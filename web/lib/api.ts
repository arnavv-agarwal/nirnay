// Typed client for the Nirnay FastAPI back end. Types mirror triage/schemas.py.

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Category = "refund" | "batch_access" | "payment" | "technical" | "academic_doubt" | "other";
export type Status = "urgent" | "needs_review" | "auto_sent" | "resolved";
export type Channel = "whatsapp" | "email" | "form";

export interface Issue { category: Category; confidence: number }

export interface Classification {
  issues: Issue[];
  needs_human_action: boolean;
  needs_human_reason: string;
  at_risk: boolean;
  at_risk_reason: string;
  language: "en" | "hinglish" | "hi";
  summary: string;
}

export type ReasonCode = "at_risk" | "needs_action" | "out_of_scope" | "low_confidence" | "citation_failed" | "ai_failed"
  | "repeat_contact";

export interface Detail { kind: string; value: string }

export interface Decision { escalate: boolean; priority: "urgent" | "normal" | "none"; reasons: string[]; codes: ReasonCode[] }

export interface Usage { input_tokens: number; output_tokens: number; cost_usd: number; latency_s: number }

export interface TriageResult {
  ticket: string;
  cleaned: string;
  classification: Classification;
  sections: string[];
  reply: string;
  citation_issues: string[];
  decision: Decision;
  usage: Usage;
  model: string;
  error: string | null;
  details?: Detail[];
  acknowledgement?: string;   // sent at once when a person will handle it
  student_reply?: string;     // an automatic reply as the student got it: numbered sources, not [IDs]
  footer?: string;            // added to automatic replies
}

export interface Ticket {
  id: string;
  student: string;
  channel: Channel;
  text: string;
  received_at: string;
  status: Status;
  result: TriageResult;
  final_reply: string | null;
  final_student_reply?: string | null;  // the agent's reply as the student got it (triage/sources.py)
  resolved_at: string | null;
  source: "demo" | "live";
  corrected_categories: Category[] | null;
  corrected_at: string | null;
  prior_contacts: number;
  reopened_at: string | null;  // an agent said this automatic reply should have come to a person
}

export interface LiveStats {
  tickets: number;
  auto_replied: number;
  came_back_after_auto_reply: number;
  came_back_ids: string[];
  repeat_contacts: number;
  corrections: number;
  reopened: number;      // automatic replies an agent said should have come to a person
  handled: number;
}

export interface CorrectionRow {
  id: string;
  text: string;
  channel: Channel;
  predicted: Category[];
  corrected: Category[] | null;   // null when the agent only reopened the ticket
  corrected_at: string | null;
  reopened_at: string | null;     // set when an automatic reply should have come to a person
}

export interface ModelOption { id: string; name: string; available: boolean }

export interface Settings {
  threshold: number;
  model: string;
  models: ModelOption[];
  has_api_key: boolean;
  categories: Category[];
  queue: { needs_you: number; urgent: number };
  ai_calls_left_today: number;  // the demo's daily AI budget (server/limits.py)
}

export interface Section { id: string; title: string; doc: string; source: string; text: string }

export interface PR { precision: number; recall: number; f1: number; tp: number; fp: number; fn: number }

export interface EvalSummary {
  tickets: number;
  category_exact_match: number;
  categories: Record<Category, PR & { support: number }>;
  escalation: PR;
  escalation_accuracy: number;
  missed_escalations: string[];
  unneeded_escalations: string[];
  auto_reply_rate: number;
  at_risk: PR;
  needs_human: PR;
  citation_pass_rate: number;
  model_errors: number;
  cost_usd_total: number;
  cost_usd_per_ticket: number;
  latency_s_mean: number;
  latency_s_p95: number;
}

export interface EvalRow {
  id: string;
  text: string;
  channel: Channel;
  language: string;
  note: string;
  categories: Category[];
  should_escalate: boolean;
  needs_human_action: boolean;
  at_risk: boolean;
  pred_categories: Category[];
  pred_escalate: boolean;
  pred_at_risk: boolean;
  pred_needs_human: boolean;
  min_confidence: number;
  reasons: string[];
  codes?: ReasonCode[];
  reply: string;
  citation_issues: string[];
  error: string | null;
  fixed_escalate: boolean; // escalates whatever the threshold (risk, action, other, citations, error)
}

export interface EvalRunSummary { name: string; model: string; model_name: string; split: string; summary: EvalSummary }
export interface EvalRun extends EvalRunSummary { rows: EvalRow[] }

export class ApiError extends Error {
  constructor(message: string, readonly status = 0) { super(message); }   // status: the HTTP code, 0 = unreachable
}

// The last answer to each read, kept in memory, so a page you come back to shows at once
// and then refreshes quietly in the background (no loading screen on every tab switch).
const lastSeen = new Map<string, unknown>();
export const cached = <T,>(path: string) => lastSeen.get(path) as T | undefined;
export const remember = (path: string, value: unknown) => { lastSeen.set(path, value); };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Can't reach the Nirnay API. Is the server running on " + API_URL + "?");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = typeof body?.detail === "string" ? body.detail : `Request failed (${res.status})`;
    throw new ApiError(detail, res.status);
  }
  const data = (await res.json()) as T;
  if (!init?.method) remember(path, data);   // reads only
  return data;
}

export const api = {
  settings: () => request<Settings>("/api/settings"),
  updateSettings: (update: { threshold?: number; model?: string }) =>
    request<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(update) }),
  tickets: () => request<Ticket[]>("/api/tickets"),
  createTicket: (text: string, channel: Channel, student: string) =>
    request<Ticket>("/api/tickets", { method: "POST", body: JSON.stringify({ text, channel, student }) }),
  correct: (id: string, categories: Category[]) =>
    request<Ticket>(`/api/tickets/${id}/correction`, { method: "POST", body: JSON.stringify({ categories }) }),
  reopen: (id: string) => request<Ticket>(`/api/tickets/${id}/reopen`, { method: "POST" }),
  corrections: () => request<CorrectionRow[]>("/api/corrections"),
  liveStats: () => request<LiveStats>("/api/live-stats"),
  correctionsExportUrl: `${API_URL}/api/corrections.jsonl`,
  sendReply: (id: string, reply: string) =>
    // keepalive: a reply sent as the page closes (see the inbox page) still reaches the server
    request<Ticket>(`/api/tickets/${id}/send`, { method: "POST", body: JSON.stringify({ reply }), keepalive: true }),
  kb: () => request<Section[]>("/api/kb"),
  evalRuns: () => request<EvalRunSummary[]>("/api/eval/runs"),
  evalRun: (name: string) => request<EvalRun>(`/api/eval/runs/${encodeURIComponent(name)}`),
};
