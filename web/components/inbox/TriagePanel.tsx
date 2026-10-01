"use client";

import { useState } from "react";
import { AlertTriangle, Check, CheckCircle2, ChevronDown, Copy, Layers, Pencil, Plus, RotateCcw, TextQuote } from "lucide-react";
import type { Category, Section, Ticket } from "@/lib/api";
import type { Trend } from "@/lib/trends";
import { LANGUAGE_LABEL, REASON_TEXT, TOPICS, TOPIC_LABEL, confidenceLevel, reasonDetail, sourceOf } from "@/lib/labels";
import { ConfidenceDot, Tag } from "../Tag";
import styles from "./TriagePanel.module.css";

const CITATION = /\[([A-Z]{2}-\d+)\]/g;
export const citedIn = (text: string) => Array.from(new Set(Array.from(text.matchAll(CITATION), (m) => m[1])));

interface Props {
  ticket: Ticket;
  draft: string;                    // the reply as it stands in the composer
  threshold: number;
  sections: Record<string, Section>;
  trend: Trend | null;              // a batch or centre with 3+ tickets in a day that includes this one
  onTrend: (group: Trend) => void;
  modelNames: Record<string, string>;
  onCorrect: (categories: Category[]) => Promise<void>;
  onCite: (sectionId: string) => void;    // adds "[ID]" after the agent's own sentence
  onQuote: (sectionId: string) => void;   // adds the article's text with its citation
  onReopen: () => void;                   // an automatic reply should have come to a person
}

// Why the ticket reached a person, in plain words, stated before anything else.
// Also rendered at the top of the conversation on phones.
export function WhyCallout({ ticket, onReopen }: { ticket: Ticket; onReopen?: () => void }) {
  const r = ticket.result;
  if (ticket.status === "urgent" || ticket.status === "needs_review") {
    const urgent = ticket.status === "urgent";
    return (
      <section className={`${styles.why} ${urgent ? styles.whyUrgent : styles.whyReview}`}>
        <h3 className={styles.whyTitle}>
          <AlertTriangle size={16} aria-hidden="true" /> {urgent ? "Urgent: why this needs you" : "Why this needs you"}
        </h3>
        <ul className={styles.reasons}>
          {ticket.reopened_at && (
            <li>
              <strong>An agent reopened Nirnay&apos;s automatic reply</strong>
              <span className={styles.hint}>That reply was already sent. Follow up with the student.</span>
            </li>
          )}
          {r.decision.codes.map((code) => {
            const detail = reasonDetail(ticket, code);
            return (
              <li key={code}>
                <strong>{REASON_TEXT[code].title}</strong>
                {detail && <span className={styles.detail}>{detail}</span>}
                <span className={styles.hint}>{REASON_TEXT[code].hint}</span>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }
  if (ticket.status === "auto_sent") {
    return (
      <section className={`${styles.why} ${styles.whyOk}`}>
        <h3 className={styles.whyTitle}><CheckCircle2 size={16} aria-hidden="true" /> {r.reply ? "Resolved automatically" : "Safe to auto-reply"}</h3>
        <p className={styles.okText}>Confident about the topic, no account change needed, student not upset{r.reply ? ", and every line of the reply is backed by a help article" : ""}.</p>
        {onReopen && (
          <button className={`btn btn-ghost btn-sm ${styles.reopen}`} onClick={onReopen}>
            <RotateCcw size={14} aria-hidden="true" /> Should a person handle this? Reopen it
          </button>
        )}
      </section>
    );
  }
  return null;
}

export function TriagePanel({ ticket, draft, threshold, sections, trend, onTrend, modelNames, onCorrect, onCite, onQuote, onReopen }: Props) {
  const r = ticket.result;
  const c = r.classification;
  const open = ticket.status === "urgent" || ticket.status === "needs_review";
  const keywordMode = r.model === "baseline";
  const cited = citedIn(open ? draft : ticket.final_reply ?? r.reply);
  // Articles Nirnay picked, already in order: the topic's own articles, then any PW
  // programme the student named (Vidyapeeth, PW Store...), then contact/escalation.
  const suggested = r.sections.filter((id) => !cited.includes(id));
  // The six most relevant show first; the rest are one click away. Remembered per ticket.
  const [showAllFor, setShowAllFor] = useState<string | null>(null);
  const showAll = showAllFor === ticket.id;

  return (
    <aside className={styles.panel} aria-label="Nirnay's triage">
      <div className={styles.whySlot}><WhyCallout ticket={ticket} onReopen={onReopen} /></div>

      <section className={styles.block}>
        <h3 className={styles.blockTitle}>Triage</h3>
        <dl className={styles.facts}>
          <div>
            <dt>Topic</dt>
            <dd className={styles.topics}>
              {c.issues.map((i) => (
                <span key={i.category} className={styles.topic}>
                  <Tag tone="primary">{TOPIC_LABEL[i.category]}</Tag>
                  <ConfidenceDot level={confidenceLevel(i.confidence, threshold)} />
                </span>
              ))}
            </dd>
          </div>
          <div>
            <dt>Mood</dt>
            <dd>{c.at_risk ? <Tag tone="error">Upset or at risk</Tag> : <span className={styles.muted}>No risk signals</span>}</dd>
          </div>
          <div>
            <dt>Account change</dt>
            <dd>{c.needs_human_action ? <Tag tone="warning">Needed</Tag> : <span className={styles.muted}>Not needed</span>}</dd>
          </div>
          <div>
            <dt>Language</dt>
            <dd>{LANGUAGE_LABEL[c.language]}</dd>
          </div>
        </dl>
        {c.summary && !keywordMode && !r.error && <p className={styles.summary}>{c.summary}</p>}
        {r.details && r.details.length > 0 && (
          <div className={styles.details}>
            <p className={styles.subhead}>Details in the message</p>
            <ul>{r.details.map((d) => <DetailChip key={d.kind + d.value} kind={d.kind} value={d.value} />)}</ul>
          </div>
        )}
        {trend && open && (
          <div className={styles.trend}>
            <Layers size={15} aria-hidden="true" />
            <p>
              <strong>{trend.ids.length - 1} other student{trend.ids.length === 2 ? "" : "s"} wrote about {trend.label}</strong> in
              the same day{trend.ids.length > trend.open ? `, ${trend.ids.length - trend.open} already answered` : ""}. It may be one cause.
            </p>
            <button className="btn btn-ghost btn-sm" onClick={() => onTrend(trend)}>Show {trend.label} tickets</button>
          </div>
        )}
        <CorrectTopic key={ticket.id} ticket={ticket} onCorrect={onCorrect} />
      </section>

      <section className={styles.block}>
        <h3 className={styles.blockTitle}>Help articles</h3>
        {cited.length > 0 && (
          <>
            <p className={styles.subhead}>Cited in the reply</p>
            <ul className={styles.sources}>
              {cited.map((id) => <Article key={id} id={id} section={sections[id]} />)}
            </ul>
          </>
        )}
        {suggested.length > 0 && (
          <>
            <p className={styles.subhead}>{open ? "Suggested for this ticket, best match first" : "Matched to this ticket"}</p>
            <ul className={styles.sources}>
              {(showAll ? suggested : suggested.slice(0, 6)).map((id) => (
                <Article key={id} id={id} section={sections[id]}
                         onQuote={open ? () => onQuote(id) : undefined}
                         action={open ? <button className={styles.insert} onClick={() => onCite(id)} aria-label={`Cite ${id} in the reply`} title="Add the reference after your own sentence"><Plus size={13} /> Cite</button> : undefined} />
              ))}
            </ul>
            {suggested.length > 6 && (
              <button className={styles.more} onClick={() => setShowAllFor(showAll ? null : ticket.id)}>
                {showAll ? "Show fewer" : `Show all ${suggested.length} articles`}
              </button>
            )}
          </>
        )}
        {cited.length === 0 && suggested.length === 0 && <p className={styles.muted}>No articles matched this ticket.</p>}
      </section>

      <details className={styles.trace}>
        <summary>How Nirnay decided <ChevronDown size={14} aria-hidden="true" /></summary>
        <ol>
          <Step kind="Rule" name="Cleaned the message" detail="Phone numbers and emails hidden from the AI" />
          <Step kind={keywordMode || r.error ? "Rule" : "AI"} name="Read the ticket"
                detail={keywordMode ? "Keyword rules (no AI)" : r.error ? "AI failed, used keyword rules" : modelNames[r.model] ?? r.model} bad={!!r.error} />
          <Step kind="Rule" name="Picked help articles" detail={r.sections.length ? `${r.sections.length} articles for these topics` : "None"} />
          <Step kind="AI" name="Drafted the reply" detail={r.reply ? "Only from those articles, citing each" : "Skipped"} />
          <Step kind="Rule" name="Checked the citations" detail={r.citation_issues.length ? r.citation_issues.join("; ") : r.reply ? "All point to real articles" : "Nothing to check"} bad={r.citation_issues.length > 0} />
          <Step kind="Rule" name="Decided" detail={r.decision.escalate ? "Escalation rule matched" : "No escalation rule matched"} />
        </ol>
        <p className={styles.cost}>{r.usage.cost_usd ? `$${r.usage.cost_usd.toFixed(4)} · ${r.usage.latency_s.toFixed(1)}s` : "No AI cost (keyword mode)"}</p>
      </details>
    </aside>
  );
}

// One help article: click to read it; while replying, insert its text or just cite it.
function Article({ id, section, action, onQuote }: { id: string; section?: Section; action?: React.ReactNode; onQuote?: () => void }) {
  const src = section ? sourceOf(section.source) : null;
  return (
    <li className={styles.article}>
      <details>
        <summary title="Read this article">
          <span className={styles.sourceId}>{id}</span>
          <span className={styles.sourceTitle}>{section?.title ?? "Unknown article"}</span>
          <ChevronDown size={14} className={styles.chev} aria-hidden="true" />
        </summary>
        {section && (
          <div className={styles.sourceBody}>
            <p>{section.text}</p>
            <p className={src?.kind === "official" ? styles.official : styles.assumed}>
              {src?.label}{src?.url && <> · <a href={src.url} target="_blank" rel="noreferrer">source</a></>}
            </p>
            {onQuote && (
              <button className={`btn btn-outline btn-sm ${styles.quote}`} onClick={onQuote}>
                <TextQuote size={14} aria-hidden="true" /> Insert into reply
              </button>
            )}
          </div>
        )}
      </details>
      {action}
    </li>
  );
}

// Order IDs, transaction refs and amounts, found by plain pattern matching; one click to copy.
function DetailChip({ kind, value }: { kind: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard blocked: the value is still visible to select */
    }
  }
  return (
    <li>
      <button className={styles.chip} onClick={() => void copy()} title={`Copy ${kind}`}>
        <span className={styles.chipKind}>{kind}</span>
        <span className={styles.chipValue}>{value}</span>
        {copied ? <Check size={12} aria-label="Copied" /> : <Copy size={12} aria-hidden="true" />}
      </button>
    </li>
  );
}

function Step({ kind, name, detail, bad = false }: { kind: "AI" | "Rule"; name: string; detail: string; bad?: boolean }) {
  return (
    <li className={bad ? styles.stepBad : ""}>
      <span className={`${styles.kind} ${kind === "AI" ? styles.kindAi : ""}`}>{kind}</span>
      <span><strong>{name}</strong><br /><span className={styles.stepDetail}>{detail}</span></span>
    </li>
  );
}

// Agents fix wrong topics here; each fix is saved as a new labelled example for the next evaluation.
function CorrectTopic({ ticket, onCorrect }: { ticket: Ticket; onCorrect: (c: Category[]) => Promise<void> }) {
  const predicted = ticket.result.classification.issues.map((i) => i.category);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Category[]>(ticket.corrected_categories ?? predicted);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (ticket.corrected_categories && !open) {
    return (
      <p className={styles.corrected}>
        Corrected by an agent to <strong>{ticket.corrected_categories.map((c) => TOPIC_LABEL[c]).join(", ")}</strong>.
        Saved as a labelled example. <button className={styles.linkBtn} onClick={() => setOpen(true)}>Change</button>
      </p>
    );
  }
  if (!open) {
    return <button className={`btn btn-ghost btn-sm ${styles.correctBtn}`} onClick={() => setOpen(true)}><Pencil size={13} /> Topic wrong? Correct it</button>;
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await onCorrect(picked);
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <fieldset className={styles.correct}>
      <legend>What is this ticket really about?</legend>
      {TOPICS.map((t) => (
        <label key={t.id} className={styles.check}>
          <input type="checkbox" checked={picked.includes(t.id)}
                 onChange={(e) => setPicked((p) => e.target.checked ? [...p, t.id] : p.filter((x) => x !== t.id))} />
          {t.label}
        </label>
      ))}
      {error && <p className={styles.errorText} role="alert">{error}</p>}
      <div className={styles.correctActions}>
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} disabled={saving}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={() => void save()} disabled={saving || picked.length === 0}>
          {saving ? "Saving…" : "Save correction"}
        </button>
      </div>
    </fieldset>
  );
}
