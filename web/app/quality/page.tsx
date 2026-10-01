"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { api, type CorrectionRow, type EvalRun, type EvalRunSummary, type LiveStats } from "@/lib/api";
import { useSettings } from "@/components/SettingsProvider";
import { ThresholdChart } from "@/components/quality/ThresholdChart";
import { ResultsTable } from "@/components/quality/ResultsTable";
import { TOPICS, TOPIC_LABEL, ago, pct } from "@/lib/labels";
import { markAt, sweep } from "@/lib/remark";
import styles from "./quality.module.css";

const SETS = [
  { id: "test", label: "Held-out test set", note: "Tickets never used while tuning prompts" },
  { id: "dev", label: "Tuning set", note: "Tickets used to tune prompts" },
  { id: "blind", label: "Blind set", note: "Written by someone who never saw the prompts" },
];
const SET_NAME: Record<string, string> = { test: "held-out test set", dev: "tuning set", blind: "blind set" };

export default function QualityPage() {
  const { settings, update } = useSettings();
  const [runs, setRuns] = useState<EvalRunSummary[] | null>(null);
  const [set, setSet] = useState("test");
  const [runName, setRunName] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<EvalRun | null>(null);
  const [threshold, setThreshold] = useState<number | null>(null);
  const [onlyMistakes, setOnlyMistakes] = useState(false);
  const [applyNote, setApplyNote] = useState<string | null>(null);
  const [corrections, setCorrections] = useState<CorrectionRow[] | null>(null);
  const [live, setLive] = useState<LiveStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.evalRuns().then(setRuns, (e: Error) => setError(e.message));
    api.corrections().then(setCorrections, () => setCorrections([]));
    api.liveStats().then(setLive, () => setLive(null));
  }, []);

  const runsForSet = useMemo(() => runs?.filter((r) => r.split === set) ?? [], [runs, set]);
  // Default to the model the live inbox uses, so the page describes what agents actually get.
  const activeName = runsForSet.some((r) => r.name === runName)
    ? runName
    : (runsForSet.find((r) => r.model === settings?.model) ?? runsForSet.find((r) => r.model !== "baseline") ?? runsForSet[0])?.name ?? null;

  useEffect(() => {
    if (activeName) api.evalRun(activeName).then(setLoaded, (e: Error) => setError(e.message));
  }, [activeName]);

  const run = loaded?.name === activeName ? loaded : null;
  const t = threshold ?? settings?.threshold ?? 0.8;
  const points = useMemo(() => (run ? sweep(run.rows) : []), [run]);
  const marks = useMemo(() => (run ? markAt(run.rows, t) : null), [run, t]);

  async function apply() {
    setApplyNote("Applying…");
    try {
      const next = await update({ threshold: t });
      setApplyNote(`Live inbox now uses ${next.threshold.toFixed(2)} for new tickets. Tickets already answered, or waiting for a person, stay where they are.`);
    } catch (e) {
      setApplyNote((e as Error).message);
    }
  }

  const s = run?.summary;
  const n = run?.rows.length ?? 0;
  const keywordOnly = run?.model === "baseline";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Quality</h1>
          <p className={styles.lede}>How well Nirnay decides, measured on labelled tickets. Choose the confidence threshold here: it sets how cautious the live inbox is.</p>
        </div>
        <div className={styles.pickers}>
          <label className={styles.select}>
            <span>Ticket set</span>
            <select value={set} onChange={(e) => setSet(e.target.value)}>
              {SETS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
          </label>
          <label className={styles.select}>
            <span>Model</span>
            <select value={activeName ?? ""} onChange={(e) => setRunName(e.target.value)} disabled={runsForSet.length < 2}>
              {runsForSet.map((r) => <option key={r.name} value={r.name}>{r.model_name}</option>)}
            </select>
          </label>
        </div>
      </header>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {runs && !runsForSet.length && <p className={styles.muted}>No evaluation runs yet. Run <code>python -m eval.run_eval --split {set}</code>.</p>}

      {keywordOnly && (
        <p className={styles.banner}>
          These results are the <strong>keyword baseline</strong> (no AI): the bar the AI models have to beat. Pick a Claude model above to compare.
        </p>
      )}

      {run && s && marks && (
        <>
          <section className={styles.kpis} aria-label="Headline results">
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Routing accuracy</span>
              <span className={styles.kpiValue}>{pct(marks.correct / Math.max(1, marks.total))}</span>
              <span className={styles.kpiNote}>{marks.correct} of {marks.total} tickets sent to the right place</span>
            </div>
            <div className={`${styles.kpi} ${marks.missed ? styles.kpiBad : ""}`}>
              <span className={styles.kpiLabel}>Missed escalations</span>
              <span className={styles.kpiValue}>{marks.missed}</span>
              <span className={styles.kpiNote}>needed a person, got an auto-reply</span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Answered automatically</span>
              <span className={styles.kpiValue}>{pct(marks.autoReplyRate)}</span>
              <span className={styles.kpiNote}>{marks.unneeded} sent to a person unnecessarily</span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Topic accuracy</span>
              <span className={styles.kpiValue}>{pct(s.category_exact_match)}</span>
              <span className={styles.kpiNote}>{Math.round(s.category_exact_match * n)} of {n} tickets, every topic right</span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Upset students caught</span>
              <span className={styles.kpiValue}>{s.at_risk.tp}<small>/{s.at_risk.tp + s.at_risk.fn}</small></span>
              <span className={styles.kpiNote}>{s.at_risk.fp} flagged who weren&apos;t upset</span>
            </div>
          </section>

          <div className={styles.grid}>
            <section className={`card ${styles.panel}`} aria-labelledby="tradeoff">
              <div className={styles.panelHead}>
                <h2 id="tradeoff" className={styles.panelTitle}>Confidence threshold</h2>
                <p className={styles.panelSub}>Raise it and more tickets go to people: fewer mistakes reach students, more work for agents.</p>
              </div>
              <ThresholdChart points={points} value={t} onChange={(v) => { setThreshold(v); setApplyNote(null); }} />
              <div className={styles.apply}>
                <button className="btn btn-primary" onClick={() => void apply()} disabled={!settings || Math.abs(settings.threshold - t) < 0.001}>
                  Use {t.toFixed(2)} in the live inbox
                </button>
                <span className={styles.applyNote} role="status">{applyNote ?? (settings ? `Live inbox uses ${settings.threshold.toFixed(2)}.` : "")}</span>
              </div>
            </section>

            <div className={styles.side}>
              <section className={`card ${styles.panel}`} aria-labelledby="rule">
                <h2 id="rule" className={styles.panelTitle}>When Nirnay hands a ticket to a person</h2>
                <p className={styles.panelSub}>Plain code, not the model&apos;s judgement. Any one of these is enough:</p>
                <ol className={styles.rule}>
                  <li><strong>The student is upset or at risk</strong>: angry, threatening, repeating a complaint, distressed. Marked urgent.</li>
                  <li><strong>It needs an account or payment change</strong>: refunds, batch changes, blocked accounts, missing batches after payment.</li>
                  <li><strong>The help articles don&apos;t cover it.</strong></li>
                  <li><strong>Confidence is below the threshold</strong> for any topic in the ticket.</li>
                  <li><strong>The draft&apos;s citations fail the check</strong>, or the AI call fails.</li>
                  <li><strong>The student already wrote this week</strong>: the second message goes to a person, the third is marked urgent. (Live inbox only: test tickets have no history.)</li>
                </ol>
              </section>

              <section className={`card ${styles.panel}`} aria-labelledby="topics">
                <h2 id="topics" className={styles.panelTitle}>By topic</h2>
                <table className={styles.table}>
                  <thead><tr><th>Topic</th><th>Precision</th><th>Recall</th><th>Tickets</th></tr></thead>
                  <tbody>
                    {TOPICS.map((topic) => {
                      const m = s.categories[topic.id];
                      return (
                        <tr key={topic.id}>
                          <td>{topic.label}</td>
                          <td className={m.precision < 0.8 ? styles.weak : ""}>{pct(m.precision)}</td>
                          <td className={m.recall < 0.8 ? styles.weak : ""}>{pct(m.recall)}</td>
                          <td>{m.support}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className={styles.small}>Below 80% is flagged. Cost {keywordOnly ? "is zero (no AI)" : `$${s.cost_usd_per_ticket.toFixed(4)} per ticket · p95 ${s.latency_s_p95.toFixed(1)}s`}.</p>
              </section>
            </div>
          </div>

          {runsForSet.length > 1 && (
            <section className={`card ${styles.panel}`} aria-labelledby="models">
              <h2 id="models" className={styles.panelTitle}>Models compared</h2>
              <table className={styles.table}>
                <thead><tr><th>Model</th><th>Routing accuracy</th><th>Escalation recall</th><th>Auto-reply</th><th>Cost / ticket</th><th>p95 time</th></tr></thead>
                <tbody>
                  {runsForSet.map((r) => (
                    <tr key={r.name} className={r.name === activeName ? styles.current : ""}>
                      <td>{r.model_name}</td>
                      <td>{pct(r.summary.escalation_accuracy)}</td>
                      <td>{pct(r.summary.escalation.recall)}</td>
                      <td>{pct(r.summary.auto_reply_rate)}</td>
                      <td>${r.summary.cost_usd_per_ticket.toFixed(4)}</td>
                      <td>{r.summary.latency_s_p95.toFixed(1)}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className={styles.small}>Each scored at threshold 0.70.</p>
            </section>
          )}

          <section className={`card ${styles.panelFlush}`} aria-labelledby="results">
            <div className={styles.tableBar}>
              <div>
                <h2 id="results" className={styles.panelTitle}>Every ticket in the {SET_NAME[set]}</h2>
                <p className={styles.panelSub}>Scored at threshold {t.toFixed(2)} against the labels. Click a row for details.</p>
              </div>
              <label className={styles.toggle}>
                <input type="checkbox" checked={onlyMistakes} onChange={(e) => setOnlyMistakes(e.target.checked)} />
                Only mistakes
              </label>
            </div>
            <ResultsTable rows={run.rows} threshold={t} onlyMistakes={onlyMistakes} />
          </section>

          {live && (
            <section className={`card ${styles.panel}`} aria-labelledby="live">
              <div className={styles.panelHead}>
                <h2 id="live" className={styles.panelTitle}>Live inbox: did it really work?</h2>
                <p className={styles.panelSub}>
                  Measured on the inbox itself, not the test set. An automatic reply only counts as resolved if the
                  student didn&apos;t write back within 7 days, so no &ldquo;assumed resolved&rdquo;. In this demo the
                  inbox holds synthetic tickets, so these numbers show how the measure works, not real results.
                </p>
              </div>
              <div className={styles.liveGrid}>
                <div className={styles.liveItem}>
                  <span className={styles.liveValue}>{live.auto_replied ? pct(1 - live.came_back_after_auto_reply / live.auto_replied) : "n/a"}</span>
                  <span className={styles.liveLabel}>of automatic replies stayed resolved</span>
                  <span className={styles.liveNote}>{live.came_back_after_auto_reply} of {live.auto_replied} students wrote back{live.came_back_ids.length ? ` (${live.came_back_ids.join(", ")})` : ""}</span>
                </div>
                <div className={styles.liveItem}>
                  <span className={styles.liveValue}>{live.repeat_contacts}</span>
                  <span className={styles.liveLabel}>repeat contacts caught</span>
                  <span className={styles.liveNote}>2nd message goes to a person, 3rd is urgent</span>
                </div>
                <div className={styles.liveItem}>
                  <span className={styles.liveValue}>{live.handled ? pct((live.corrections + live.reopened) / live.handled) : "0%"}</span>
                  <span className={styles.liveLabel}>of handled tickets an agent corrected</span>
                  <span className={styles.liveNote}>{live.corrections} topic corrections and {live.reopened} reopened automatic replies, each saved as a new label</span>
                </div>
              </div>
            </section>
          )}

          <div className={styles.grid2}>
            <section className={`card ${styles.panel}`} aria-labelledby="corrections">
              <div className={styles.panelHeadRow}>
                <h2 id="corrections" className={styles.panelTitle}>Agent corrections</h2>
                <a className="btn btn-outline btn-sm" href={api.correctionsExportUrl} download="agent-corrections.jsonl">
                  <Download size={14} /> Export as labels
                </a>
              </div>
              <p className={styles.panelSub}>When an agent fixes a wrong topic, or reopens an automatic reply that should have come to a person, it lands here as a new labelled example for the next evaluation.</p>
              {corrections === null ? (
                <span className="skeleton" style={{ height: 40, display: "block" }} />
              ) : corrections.length === 0 ? (
                <p className={styles.muted}>No corrections yet.</p>
              ) : (
                <ul className={styles.corrections}>
                  {corrections.map((c) => (
                    <li key={c.id}>
                      <span className={styles.corrId}>{c.id}</span>
                      <span>
                        {c.corrected && <>{c.predicted.map((x) => TOPIC_LABEL[x]).join(", ")} → <strong>{c.corrected.map((x) => TOPIC_LABEL[x]).join(", ")}</strong></>}
                        {c.corrected && c.reopened_at && "; "}
                        {c.reopened_at && <strong>Should have come to a person</strong>}
                      </span>
                      <span className={styles.muted}>{ago((c.reopened_at ?? "") > (c.corrected_at ?? "") ? c.reopened_at! : c.corrected_at!)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={`card ${styles.panel}`} aria-labelledby="caveat">
              <h2 id="caveat" className={styles.panelTitle}>Read before trusting these numbers</h2>
              <ul className={styles.caveats}>
                <li>The tickets are synthetic, written to mirror public PW complaint themes, and labelled with a written guide.</li>
                <li>The same person wrote the tuning and held-out tickets, the prompts and the keyword lists, so those scores are likely optimistic. The blind set, written by someone who never saw the prompts, is the harder test: see Ticket set.</li>
                <li>{n} tickets is a small sample: one ticket moves accuracy by {pct(1 / Math.max(1, n))}.</li>
              </ul>
            </section>
          </div>
        </>
      )}
    </main>
  );
}
