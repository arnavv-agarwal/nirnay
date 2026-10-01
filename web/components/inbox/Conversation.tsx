"use client";

import { useState } from "react";
import { AlertTriangle, BookOpen, History, Info, Send, Sparkles } from "lucide-react";
import type { Section, Ticket } from "@/lib/api";
import { CHANNEL_LABEL, LANGUAGE_LABEL, STATUS_LABEL, ago, clockTime, initials, preview, sourceOf } from "@/lib/labels";
import { StatusTag } from "../Tag";
import { ChannelIcon } from "./TicketList";
import { WhyCallout, citedIn } from "./TriagePanel";
import styles from "./Conversation.module.css";

interface Props {
  ticket: Ticket;
  sections: Record<string, Section>;
  draft: string;                        // held by the page, so "Cite" in the triage panel can add to it
  onDraft: (text: string) => void;
  onSend: (reply: string) => Promise<void>;
  pending: boolean;                     // sent, inside the undo window
  usedDraft: boolean;                   // the agent started from Nirnay's draft
  onUseDraft: () => void;
  onReopen: () => void;
  history: Ticket[];                    // this student's other tickets within 7 days, oldest first
  onOpen: (id: string) => void;
}

// Replies carry citations like [RF-2]. Agents see them as small source markers.
function ReplyText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[A-Z]{2}-\d+\])/g).map((part, i) =>
        /^\[[A-Z]{2}-\d+\]$/.test(part)
          ? <sup key={i} className={styles.cite} title={`Source ${part.slice(1, -1)}`}>{part.slice(1, -1)}</sup>
          : part,
      )}
    </>
  );
}

export function Conversation({ ticket, sections, draft, onDraft, onSend, pending, usedDraft, onUseDraft, onReopen, history, onOpen }: Props) {
  const r = ticket.result;
  const open = ticket.status === "urgent" || ticket.status === "needs_review";
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A reopened ticket already had Nirnay's reply sent, so its draft isn't offered again.
  const offerDraft = !!r.reply && !ticket.reopened_at;
  const draftInBox = offerDraft && draft.includes(r.reply.trim());
  const draftLabel = !usedDraft ? null : draft.trim() === r.reply.trim() ? "Nirnay's draft: check it before sending" : "Edited from Nirnay's draft";
  const cited = citedIn(draft);
  const keywordMode = r.model === "baseline";
  // Replies should rest on real PW policy: flag any cited article that is only an assumption.
  const unverified = cited.filter((id) => sections[id] && sourceOf(sections[id].source).kind !== "official");

  async function send() {
    if (!open || !draft.trim() || sending || pending) return;
    setSending(true);
    setError(null);
    try {
      await onSend(draft.trim());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  // What the student actually received: [IDs] become numbered sources (triage/sources.py).
  const autoText = (ticket.status === "auto_sent" || ticket.reopened_at) && r.reply
    ? r.student_reply || [r.reply, r.footer].filter(Boolean).join("\n\n") : null;
  const agentText = ticket.status === "resolved" ? ticket.final_student_reply ?? ticket.final_reply : null;
  const escalated = ticket.status === "urgent" || ticket.status === "needs_review";

  return (
    <section className={styles.conversation} aria-labelledby="conv-title">
      <header className={styles.header}>
        <div className={styles.who}>
          <span className={styles.avatar} aria-hidden="true">{initials(ticket.student)}</span>
          <div>
            <h2 id="conv-title" className={styles.name}>{ticket.student}</h2>
            <p className={styles.meta}>
              <ChannelIcon channel={ticket.channel} /> {CHANNEL_LABEL[ticket.channel]} · {ticket.id} · {LANGUAGE_LABEL[r.classification.language]}
            </p>
          </div>
        </div>
        <StatusTag status={ticket.status} />
      </header>

      <div className={styles.thread}>
        <div className={styles.mobileWhy}><WhyCallout ticket={ticket} onReopen={onReopen} /></div>

        {history.length > 0 && (
          <section className={styles.history} aria-label="Other messages from this student">
            <p className={styles.historyTitle}><History size={14} aria-hidden="true" /> Other messages from {ticket.student.split(" ")[0]} this week</p>
            {history.map((h) => (
              <button key={h.id} className={styles.historyItem} onClick={() => onOpen(h.id)}>
                <span className={styles.historyText}>{preview(h.text)}</span>
                <span className={styles.historyMeta}>{h.received_at < ticket.received_at ? "Before this" : "After this"} · {STATUS_LABEL[h.status]} · {ago(h.received_at)}</span>
              </button>
            ))}
          </section>
        )}

        <article className={styles.message}>
          <p className={styles.bubble} lang={r.classification.language === "hi" ? "hi" : undefined}>{ticket.text}</p>
          <p className={styles.stamp}>{clockTime(ticket.received_at)} · via {CHANNEL_LABEL[ticket.channel]}</p>
        </article>

        {autoText && (
          <article className={`${styles.message} ${styles.outgoing}`}>
            <p className={`${styles.bubble} ${styles.bubbleOut}`}><ReplyText text={autoText} /></p>
            <p className={styles.stamp}>Sent automatically by Nirnay · {clockTime(ticket.received_at)}{ticket.reopened_at ? " · reopened by an agent" : ""}</p>
          </article>
        )}
        {agentText && (
          <article className={`${styles.message} ${styles.outgoing}`}>
            <p className={`${styles.bubble} ${styles.bubbleOut}`}><ReplyText text={agentText} /></p>
            <p className={styles.stamp}>Sent by an agent · {ticket.resolved_at ? clockTime(ticket.resolved_at) : ""}</p>
          </article>
        )}

        {escalated && r.acknowledgement && (
          <article className={`${styles.message} ${styles.outgoing}`}>
            <p className={`${styles.bubble} ${styles.bubbleAck}`} lang={r.classification.language === "hi" ? "hi" : undefined}>{r.acknowledgement}</p>
            <p className={styles.stamp}>Acknowledgement sent automatically · {clockTime(ticket.received_at)}</p>
          </article>
        )}

        {ticket.status === "auto_sent" && !autoText && (
          <p className={styles.notice}>
            <Info size={15} aria-hidden="true" />
            Nirnay would answer this automatically, but keyword mode doesn&apos;t draft replies. Add an API key to turn on drafting.
          </p>
        )}
      </div>

      {open && (
        <div className={styles.composer}>
          <div className={styles.composerHead}>
            <span className={styles.composerTitle}>Reply to {ticket.student === "New student" ? "the student" : ticket.student.split(" ")[0]}</span>
            {offerDraft && !draftInBox ? (
              <button className={`btn btn-outline btn-sm ${styles.useDraft}`} onClick={onUseDraft} disabled={pending}
                      title={r.citation_issues.length ? "Its citations didn't check out: read it carefully." : "Fill the reply with Nirnay's suggestion, then edit it."}>
                <Sparkles size={14} aria-hidden="true" /> Use Nirnay&apos;s draft
              </button>
            ) : draftLabel ? (
              <span className={styles.drafted}><Sparkles size={14} aria-hidden="true" /> {draftLabel}</span>
            ) : keywordMode ? (
              <span className={styles.noDraft}>Keyword mode: no draft</span>
            ) : null}
          </div>

          <label htmlFor="reply" className="visually-hidden">Reply</label>
          <textarea
            id="reply"
            className={styles.textarea}
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            readOnly={pending}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void send(); }}
            rows={6}
            placeholder={keywordMode
              ? "Write your reply. To back it with PW policy, open a suggested help article and insert it, or cite it after your own sentence."
              : ticket.reopened_at ? "Write a follow-up to the student." : r.reply ? "Write your reply, or start from Nirnay's draft." : "Write your reply."}
          />

          <div className={styles.composerFoot}>
            <div className={styles.sources}>
              {cited.length > 0 ? (
                <>
                  <BookOpen size={14} aria-hidden="true" />
                  {cited.map((id) => (
                    <span key={id} className={styles.source} title={sections[id]?.text}>
                      <strong>{id}</strong> {sections[id]?.title ?? "Unknown article"}
                    </span>
                  ))}
                  <span className={styles.hint}>The student sees the ones with a PW page as numbered links.</span>
                </>
              ) : (
                <span className={styles.hint}>No help article cited yet. Insert or cite one from the suggested help articles.</span>
              )}
            </div>
            {unverified.length > 0 && (
              <p className={styles.unverified}>
                <AlertTriangle size={14} aria-hidden="true" />
                {unverified.join(", ")} {unverified.length === 1 ? "is" : "are"} not official PW policy. Check before sending.
              </p>
            )}
            {error && <p className={styles.error} role="alert">{error}</p>}
            <button className="btn btn-primary" onClick={() => void send()} disabled={!draft.trim() || sending || pending}>
              <Send size={15} strokeWidth={2.2} aria-hidden="true" />
              {sending || pending ? "Sending…" : "Send reply"}
              <span className="kbd">⌘↵</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
