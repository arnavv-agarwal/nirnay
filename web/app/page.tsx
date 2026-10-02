"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { api, ApiError, cached, remember, type Category, type Channel, type Section, type Ticket } from "@/lib/api";
import { preview } from "@/lib/labels";
import { isOpen, trends as findTrends } from "@/lib/trends";
import { useSettings } from "@/components/SettingsProvider";
import { TicketList, type Notice } from "@/components/inbox/TicketList";
import { NO_FILTERS, batchOptions, defaultSort, inView, matchesFilters, sortTickets, type Filters, type Sort, type View } from "@/lib/queue";
import { Conversation } from "@/components/inbox/Conversation";
import { TriagePanel } from "@/components/inbox/TriagePanel";
import { NewTicket } from "@/components/inbox/NewTicket";
import styles from "./inbox.module.css";

interface PendingSend { id: string; reply: string; student: string }
const UNDO_MS = 5000;
const POLL_MS = 15000;   // how often an open inbox checks for new tickets
const firstName = (name: string) => name.replace(/\.$/, "");

export default function InboxPage() {
  const { settings, error: settingsError, refresh } = useSettings();
  // Start from what was last loaded (instant when coming back from another tab), then refresh.
  const [tickets, setTickets] = useState<Ticket[] | null>(() => cached<Ticket[]>("/api/tickets") ?? null);
  const [sections, setSections] = useState<Record<string, Section>>(
    () => Object.fromEntries((cached<Section[]>("/api/kb") ?? []).map((s) => [s.id, s])));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<View>("needs_you");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({}); // agent edits, per ticket
  const [usedDraft, setUsedDraft] = useState<Record<string, boolean>>({}); // agent pressed "Use Nirnay's draft"
  const [notice, setNotice] = useState<Notice | null>(null);        // "Sending to … Undo", "Reply sent to …"
  // A reply waits UNDO_MS before it really goes, as in Gmail: a student can't un-receive a message.
  const [pending, setPending] = useState<PendingSend | null>(null);
  const pendingTimer = useRef<number | null>(null);
  const changedAt = useRef(0);   // when this agent last changed a ticket: older checks are stale
  const [sortChoice, setSortChoice] = useState<Sort | null>(null);   // null: the queue's own default
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);

  // Like the background check: a list asked for before the agent's last change is stale.
  const load = useCallback(() => {
    const asked = Date.now();
    return Promise.all([api.tickets(), api.kb()]).then(
      ([ts, kb]) => {
        if (asked >= changedAt.current) setTickets(ts);
        setSections(Object.fromEntries(kb.map((s) => [s.id, s])));
        setLoadError(null);
      },
      (e: Error) => setLoadError(e.message),
    );
  }, []);

  // Keep the remembered list in step with what the agent changed (sent, corrected, reopened).
  useEffect(() => { if (tickets) remember("/api/tickets", tickets); }, [tickets]);

  // Reload when the threshold changes: tickets may have moved queue.
  useEffect(() => { void load(); }, [load, settings?.threshold]);

  // Tickets from other agents and devices: check every POLL_MS while the inbox is on screen,
  // and as soon as the agent comes back to it. A failed check stays quiet; the next one retries.
  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== "visible" || pendingTimer.current) return;
      const asked = Date.now();
      api.tickets().then((ts) => {
        if (asked < changedAt.current) return;
        setSelectedId((id) => id ?? shown.current);   // a new ticket at the top doesn't swap the open one
        setTickets(ts);
      }, () => {});
      void refresh();                                  // sidebar queue counts
    };
    const timer = window.setInterval(check, POLL_MS);
    document.addEventListener("visibilitychange", check);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", check); };
  }, [refresh]);

  // Batches or centres with 3+ tickets in a day (lib/trends.ts), and every batch named, for the filter.
  const patterns = useMemo(() => (tickets ? findTrends(tickets) : []), [tickets]);
  const batches = useMemo(() => batchOptions(tickets ?? [], patterns.map((p) => p.key)), [tickets, patterns]);

  // Searching looks across every queue; otherwise the chosen queue.
  const scope: View = query.trim() ? "all" : view;
  const sort = sortChoice ?? defaultSort(scope);
  const scoped = useMemo(() => {
    if (!tickets) return [];
    const q = query.trim().toLowerCase();
    return tickets.filter((t) =>
      (q ? `${t.student} ${t.id} ${preview(t.text)}`.toLowerCase().includes(q) : inView(view, t.status)));
  }, [tickets, view, query]);
  // Then the agent's filters, then their sort (lib/queue.ts).
  // A reply waiting to go has left the queue, as far as the agent is concerned.
  const visible = useMemo(() => sortTickets(scoped.filter((t) => t.id !== pending?.id && matchesFilters(t, filters)), sort),
                          [scoped, filters, sort, pending]);

  // The open ticket: the one picked, else the first in the current view.
  const selected = tickets?.find((t) => t.id === selectedId) ?? visible[0] ?? null;
  const shown = useRef<string | null>(null);   // the ticket on screen, for the background check
  useEffect(() => { shown.current = selected?.id ?? null; }, [selected]);

  // j / k move through the list, as in most helpdesks.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (composing || (e.target as HTMLElement).closest("textarea, input, select")) return;
      if (e.key !== "j" && e.key !== "k") return;
      const i = visible.findIndex((t) => t.id === selected?.id);
      const next = visible[Math.min(visible.length - 1, Math.max(0, i + (e.key === "j" ? 1 : -1)))];
      if (next) setSelectedId(next.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, selected, composing]);

  // "Reply sent" clears itself after a few seconds; "Sending… Undo" stays until the reply goes.
  useEffect(() => {
    if (!notice || notice.tone === "pending") return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Leaving the page while a reply is waiting: closing the tab asks first, and if the page is
  // hidden anyway (switching apps or locking a phone pauses timers) the reply goes at once.
  // Nothing is lost silently.
  useEffect(() => {
    if (!pending) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    const sendNow = () => {
      if (!pendingTimer.current) return;
      window.clearTimeout(pendingTimer.current);
      pendingTimer.current = null;
      void deliver(pending);
    };
    const onHide = () => { if (document.visibilityState === "hidden") sendNow(); };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", sendNow);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", sendNow);
    };
  }, [pending]);  // eslint-disable-line react-hooks/exhaustive-deps -- deliver only uses state setters

  async function deliver(p: PendingSend) {
    changedAt.current = Date.now();
    try {
      replace(await api.sendReply(p.id, p.reply));
      setNotice({ tone: "ok", text: `Reply sent to ${firstName(p.student)}.` });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {   // another agent or device answered it first
        setNotice({ tone: "error", text: `Not sent: ${firstName(p.student)}'s ticket was already answered.` });
        void load();
      } else {
        setNotice({ tone: "error", text: `Couldn't send to ${firstName(p.student)}: ${(e as Error).message} The reply is still in the composer.` });
        setSelectedId(p.id);
      }
    } finally {
      setPending((current) => (current?.id === p.id ? null : current));
    }
  }

  // Send and move on: the next ticket that needs a person opens, as in Linear's triage and
  // Superhuman. Not while searching: the agent was looking for someone in particular.
  // The reply itself goes after UNDO_MS, unless the agent presses Undo.
  async function send(reply: string) {
    if (!selected) return;
    if (pending && pendingTimer.current) {           // a newer send sends the waiting one now
      window.clearTimeout(pendingTimer.current);
      void deliver(pending);
    }
    const p = { id: selected.id, reply, student: selected.student };
    const i = visible.findIndex((t) => t.id === selected.id);
    const next = visible.slice(i + 1).find(isOpen) ?? visible.slice(0, Math.max(i, 0)).find(isOpen);
    setPending(p);
    pendingTimer.current = window.setTimeout(() => { pendingTimer.current = null; void deliver(p); }, UNDO_MS);
    setNotice({ tone: "pending", text: `Sending to ${firstName(p.student)}…` });
    if (next && !query.trim()) setSelectedId(next.id);
    setMobileDetail(false);   // phone: back to the list, where "Sending… Undo" and "Reply sent" show
  }

  function undo() {
    if (!pending || !pendingTimer.current) return;
    window.clearTimeout(pendingTimer.current);
    pendingTimer.current = null;
    setSelectedId(pending.id);
    setMobileDetail(true);    // phone: straight back to the ticket and its reply
    setPending(null);
    setNotice({ tone: "info", text: "Not sent. The reply is back in the composer." });
  }

  // An automatic reply that should have come to a person: back to Needs you, kept as a label.
  async function reopen() {
    if (!selected) return;
    try {
      replace(await api.reopen(selected.id));
      setNotice({ tone: "info", text: `Reopened: ${selected.student} is back in Needs you for a follow-up.` });
    } catch (e) {
      setNotice({ tone: "error", text: (e as Error).message });
    }
  }

  function replace(updated: Ticket) {
    changedAt.current = Date.now();
    setTickets((prev) => prev?.map((t) => (t.id === updated.id ? updated : t)) ?? null);
    void refresh(); // sidebar queue counts
  }

  // The reply box starts empty: the agent reads the ticket first, then chooses to start from
  // Nirnay's draft (already made when the ticket arrived, so it appears instantly) or write their own.
  const draft = selected ? drafts[selected.id] ?? "" : "";
  function startFromNirnayDraft() {
    if (!selected?.result.reply) return;
    const current = draft.trimEnd();
    setDraft(current ? `${current}\n\n${selected.result.reply}` : selected.result.reply);
    setUsedDraft((u) => ({ ...u, [selected.id]: true }));
    document.getElementById("reply")?.focus();
  }
  const setDraft = (text: string) => selected && setDrafts((d) => ({ ...d, [selected.id]: text }));
  function cite(sectionId: string) {
    const current = draft.trimEnd();
    setDraft(current ? `${current} [${sectionId}]` : `[${sectionId}]`);
    document.getElementById("reply")?.focus();
  }

  // "Insert into reply": the article's text as a new paragraph, already cited. A starting
  // point to edit: articles are written for agents, so "the student" may need to become "you".
  function quote(sectionId: string) {
    // Cross-references like "(RF-1)" become real citations, so the student gets them as numbered sources.
    const text = sections[sectionId]?.text.replace(/\s+/g, " ").replace(/\(([A-Z]{2}-\d+)\)/g, "[$1]").trim();
    if (!text) return;
    const current = draft.trimEnd();
    setDraft(`${current ? `${current}\n\n` : ""}${text} [${sectionId}]`);
    document.getElementById("reply")?.focus();
  }

  async function createTicket(text: string, channel: Channel, student: string) {
    const ticket = await api.createTicket(text, channel, student);
    changedAt.current = Date.now();
    setTickets((prev) => [ticket, ...(prev ?? [])]);
    void refresh();
    setView(inView("needs_you", ticket.status) ? "needs_you" : "auto_sent");
    setQuery("");
    if (!matchesFilters(ticket, filters)) setFilters(NO_FILTERS);  // never hide the ticket just created
    setComposing(false);
    setSelectedId(ticket.id);
  }

  // Other tickets from the same student within 7 days: context, so they don't repeat themselves.
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const history = selected && selected.student !== "New student"
    ? (tickets ?? []).filter((t) => t.id !== selected.id && t.student === selected.student &&
        Math.abs(new Date(t.received_at).getTime() - new Date(selected.received_at).getTime()) <= WEEK)
      .sort((a, b) => a.received_at.localeCompare(b.received_at))
    : [];

  const modelNames = Object.fromEntries((settings?.models ?? []).map((m) => [m.id, m.name]));
  const offline = loadError ?? settingsError;

  return (
    <main className={`${styles.inbox} ${mobileDetail ? styles.showDetail : ""}`}>
      <TicketList
        tickets={tickets?.filter((t) => t.id !== pending?.id) ?? null}   // counts match the list while a reply waits
        visible={visible}
        view={view}
        onView={(v) => { setView(v); setSortChoice(null); setSelectedId(null); }}
        sort={sort}
        onSort={(s) => { setSortChoice(s); setSelectedId(null); }}
        filters={filters}
        onFilters={(f) => { setFilters(f); setSelectedId(null); }}
        scoped={scoped}
        batches={batches}
        notice={notice}
        onUndo={undo}
        query={query}
        onQuery={setQuery}
        selectedId={composing ? null : selected?.id ?? null}
        onSelect={(id) => { setComposing(false); setSelectedId(id); setMobileDetail(true); }}
        onNew={() => { setComposing((c) => !c); setMobileDetail(true); }}
        composing={composing}
      />

      <div className={styles.detail}>
        <button className={`btn btn-ghost btn-sm ${styles.back}`} onClick={() => setMobileDetail(false)}>
          <ArrowLeft size={16} /> All tickets
        </button>

        {offline ? (
          <div className={styles.offline} role="alert">
            <h2>Nirnay can&apos;t reach its server</h2>
            <p>{offline}</p>
            <p>Start it from the project folder: <code>.venv/bin/uvicorn server.app:app --port 8000</code></p>
            <button className="btn btn-outline" onClick={() => void load()}>Try again</button>
          </div>
        ) : composing ? (
          <NewTicket onSubmit={createTicket} onCancel={() => setComposing(false)} />
        ) : selected && settings ? (
          <div className={styles.workspace}>
            <Conversation key={selected.id + selected.status} ticket={selected} sections={sections}
                          draft={draft} onDraft={setDraft} history={history}
                          onOpen={(id) => { setView("all"); setSelectedId(id); }}
                          onSend={send} pending={pending?.id === selected.id}
                          usedDraft={!!usedDraft[selected.id]} onUseDraft={startFromNirnayDraft} onReopen={reopen} />
            <TriagePanel ticket={selected} draft={draft}
                         trend={patterns.find((g) => g.ids.includes(selected.id)) ?? null}
                         onTrend={(g) => { setQuery(""); setView("needs_you"); setFilters({ ...NO_FILTERS, batches: [g.key] }); }} threshold={settings.threshold} sections={sections} modelNames={modelNames}
                         onCorrect={async (cats: Category[]) => replace(await api.correct(selected.id, cats))}
                         onCite={cite} onQuote={quote} onReopen={reopen} />
          </div>
        ) : tickets ? (
          <p className={styles.nothing}>Select a ticket to see it here.</p>
        ) : (
          <div className={styles.loading}><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /></div>
        )}
      </div>
    </main>
  );
}
