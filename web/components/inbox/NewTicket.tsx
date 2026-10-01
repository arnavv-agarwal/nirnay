"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import type { Channel } from "@/lib/api";
import { CHANNEL_LABEL } from "@/lib/labels";
import styles from "./NewTicket.module.css";

// Real inputs, not just the demo inbox: paste any student message and Nirnay triages it live.
const EXAMPLES = [
  "sir maine Yakeen NEET ka batch liya 3 din pehle, paise kat gaye par batch abhi tak nahi dikh raha. order id PW7781203",
  "Is there any way to get a refund if I stop using the app after a month?",
  "यह तीसरी बार है जब मैं शिकायत कर रहा हूँ, मेरा अकाउंट अभी भी ब्लॉक है। अब मैं कंज्यूमर कोर्ट जाऊँगा।",
];

interface Props {
  onSubmit: (text: string, channel: Channel, student: string) => Promise<void>;
  onCancel: () => void;
}

export function NewTicket({ onSubmit, onCancel }: Props) {
  const [text, setText] = useState("");
  const [student, setStudent] = useState("");
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(text.trim(), channel, student.trim() || "New student");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <section className={styles.wrap} aria-labelledby="new-title">
      <div className={styles.card}>
        <header className={styles.head}>
          <div>
            <h2 id="new-title" className={styles.title}>Simulate an incoming ticket</h2>
            <p className={styles.lede}>Paste any student message. Nirnay triages it exactly like the tickets in the inbox.</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onCancel} aria-label="Close" disabled={busy}><X size={16} /></button>
        </header>

        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>Student name <span className={styles.optional}>(optional)</span></span>
            <input className={styles.input} value={student} onChange={(e) => setStudent(e.target.value)} placeholder="e.g. Riya S." maxLength={80} disabled={busy} />
          </label>
          <fieldset className={styles.field}>
            <legend className={styles.label}>Channel</legend>
            <div className={styles.segmented}>
              {(Object.keys(CHANNEL_LABEL) as Channel[]).map((ch) => (
                <label key={ch} className={channel === ch ? styles.segOn : ""}>
                  <input type="radio" name="channel" checked={channel === ch} onChange={() => setChannel(ch)} disabled={busy} />
                  {CHANNEL_LABEL[ch]}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Message</span>
          <textarea className={styles.textarea} value={text} onChange={(e) => setText(e.target.value)} rows={6} maxLength={4000}
                    onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void submit(); }}
                    placeholder="e.g. sir payment ho gaya but batch nahi dikh raha" disabled={busy} autoFocus />
        </label>

        <div className={styles.examples}>
          <span className={styles.label}>Try one:</span>
          {EXAMPLES.map((ex) => (
            <button key={ex} className={styles.example} onClick={() => setText(ex)} disabled={busy}
                    lang={/[ऀ-ॿ]/.test(ex) ? "hi" : undefined}>
              {ex.length > 58 ? ex.slice(0, 56) + "…" : ex}
            </button>
          ))}
        </div>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <footer className={styles.actions}>
          {busy && (
            <p className={styles.wait} role="status">
              Nirnay is reading the ticket, picking help articles and drafting a reply. This takes about 10 seconds.
            </p>
          )}
          <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={() => void submit()} disabled={!text.trim() || busy}>
            {busy ? <><Loader2 size={15} className={styles.spin} /> Triaging…</> : <>Triage ticket <span className="kbd">⌘↵</span></>}
          </button>
        </footer>
      </div>
    </section>
  );
}
