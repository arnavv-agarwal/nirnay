"use client";

import { AlertTriangle, CheckCircle2, Mail, MessageCircle, Plus, RotateCcw, Search, Send, SquarePen } from "lucide-react";
import type { Channel, Ticket } from "@/lib/api";
import { TOPIC_LABEL, initials, ordinal, preview, timeAgo } from "@/lib/labels";
import { NO_FILTERS, VIEWS, inView, matchesFilters, topicsOf, type Filters, type Sort, type View } from "@/lib/queue";
import { RiskTag, StatusTag, Tag } from "../Tag";
import { QueueControls } from "./QueueControls";
import styles from "./TicketList.module.css";

export function ChannelIcon({ channel, size = 13 }: { channel: Channel; size?: number }) {
  const Icon = channel === "whatsapp" ? MessageCircle : channel === "email" ? Mail : SquarePen;
  return <Icon size={size} strokeWidth={2} aria-label={channel} />;
}

// The line under the search: "Sending to … Undo", "Reply sent to …", or a send error.
export interface Notice { tone: "pending" | "ok" | "info" | "error"; text: string }

interface Props {
  tickets: Ticket[] | null;
  visible: Ticket[];
  view: View;
  onView: (v: View) => void;
  notice: Notice | null;
  onUndo: () => void;
  sort: Sort;
  onSort: (s: Sort) => void;
  filters: Filters;
  onFilters: (f: Filters) => void;
  scoped: Ticket[];
  batches: { id: string; label: string; pattern: boolean }[];
  query: string;
  onQuery: (q: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  composing: boolean;
}

// The row's second line: Nirnay's one-line summary when the AI wrote one (quicker to scan,
// and in English for Hindi tickets), otherwise the start of the student's message.
function rowText(t: Ticket): string {
  const r = t.result;
  return r.model !== "baseline" && !r.error && r.classification.summary ? r.classification.summary : preview(t.text);
}

export function TicketList({ tickets, visible, view, onView, notice, onUndo, sort, onSort,
                             filters, onFilters, scoped, batches, query, onQuery, selectedId, onSelect, onNew, composing }: Props) {
  // Tab counts follow the filters, so "Needs you 4" means four tickets the agent can see.
  const count = (v: View) => tickets?.filter((t) => inView(v, t.status) && matchesFilters(t, filters)).length ?? 0;
  const urgent = visible.filter((t) => t.status === "urgent").length;
  const filtered = Object.values(filters).some((ids) => ids.length > 0);

  return (
    <section className={styles.list} aria-label="Tickets">
      <header className={styles.head}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Inbox</h1>
          <button className={`btn ${composing ? "btn-primary" : "btn-outline"} btn-sm`} onClick={onNew} aria-pressed={composing}>
            <Plus size={15} strokeWidth={2.2} /> New ticket
          </button>
        </div>

        <div className={styles.views} role="tablist" aria-label="Queue">
          {VIEWS.map((v) => (
            <button key={v.id} role="tab" aria-selected={!query && view === v.id}
                    className={`${styles.view} ${!query && view === v.id ? styles.viewOn : ""}`} onClick={() => { onQuery(""); onView(v.id); }}>
              {v.label} <span className={styles.count}>{count(v.id)}</span>
            </button>
          ))}
        </div>

        <label className={styles.search}>
          <Search size={15} aria-hidden="true" />
          <span className="visually-hidden">Search tickets</span>
          <input type="search" value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search name, ticket or message" />
        </label>

        {query ? (
          <p className={styles.searchNote}>Searching all {tickets?.length ?? 0} tickets · {visible.length} match</p>
        ) : view === "needs_you" && sort === "urgency" && urgent > 0 && (
          <p className={styles.urgentNote}>{urgent} urgent ticket{urgent === 1 ? "" : "s"} at the top</p>
        )}

        <QueueControls sort={sort} onSort={onSort} filters={filters} onFilters={onFilters} scoped={scoped} batches={batches} />

        <p className={`${styles.notice} ${notice ? styles[notice.tone] : ""}`} role="status" aria-live="polite">
          {notice && (
            <>
              {notice.tone === "pending" ? <Send size={14} aria-hidden="true" />
                : notice.tone === "error" ? <AlertTriangle size={14} aria-hidden="true" />
                : notice.tone === "info" ? <RotateCcw size={14} aria-hidden="true" />
                : <CheckCircle2 size={14} aria-hidden="true" />}
              <span>{notice.text}</span>
              {notice.tone === "pending" && <button className={styles.undo} onClick={onUndo}>Undo</button>}
            </>
          )}
        </p>
      </header>

      <ol className={styles.rows}>
        {tickets === null && Array.from({ length: 8 }, (_, i) => (
          <li key={i} className={styles.skeletonRow}><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /></li>
        ))}
        {tickets && visible.length === 0 && (
          <li className={styles.empty}>
            {filtered ? <>No tickets match these filters. <button className={styles.inlineLink} onClick={() => onFilters(NO_FILTERS)}>Clear filters</button></>
              : query ? `No tickets match “${query}”.` : view === "needs_you"
              ? "You're all caught up. New urgent tickets will appear at the top."
              : "Nothing here yet."}
          </li>
        )}
        {visible.map((t, i) => {
          const c = t.result.classification;
          const active = t.id === selectedId;
          // "By topic": a heading wherever the topic changes, with how many tickets it has.
          const topic = topicsOf(t)[0];
          const heading = sort === "topic" && (i === 0 || topicsOf(visible[i - 1])[0] !== topic);
          return (
            <li key={t.id}>
              {heading && (
                <h2 className={styles.groupHead}>
                  {TOPIC_LABEL[topic]} <span>{visible.filter((x) => topicsOf(x)[0] === topic).length}</span>
                </h2>
              )}
              <button className={`${styles.row} ${active ? styles.rowActive : ""}`} onClick={() => onSelect(t.id)}
                      aria-current={active ? "true" : undefined}>
                <span className={styles.avatar} aria-hidden="true">{initials(t.student)}</span>
                <span className={styles.body}>
                  <span className={styles.line1}>
                    <span className={styles.name}>{t.student}</span>
                    <ChannelIcon channel={t.channel} />
                    <span className={styles.time}>{timeAgo(t.received_at)}</span>
                  </span>
                  <span className={styles.preview} lang={c.language === "hi" && rowText(t) !== c.summary ? "hi" : undefined}>{rowText(t)}</span>
                  <span className={styles.tags}>
                    <StatusTag status={t.status} />
                    {c.at_risk && t.status !== "resolved" && <RiskTag />}
                    {t.prior_contacts > 0 && <Tag tone="warning" title="Wrote again within 7 days">{ordinal(t.prior_contacts + 1)} message</Tag>}
                    <Tag>{TOPIC_LABEL[topicsOf(t)[0]]}</Tag>
                    {topicsOf(t).length > 1 && <Tag title={topicsOf(t).slice(1).map((x) => TOPIC_LABEL[x]).join(", ")}>+{topicsOf(t).length - 1}</Tag>}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className={styles.footnote}>Demo data: synthetic tickets and student names.</p>
    </section>
  );
}
