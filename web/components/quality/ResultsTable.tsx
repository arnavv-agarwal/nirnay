"use client";

// Every labelled test ticket, re-scored live at the chosen threshold.
import { Fragment, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import type { EvalRow } from "@/lib/api";
import { escalatesAt } from "@/lib/remark";
import { TOPIC_LABEL, confidenceLevel, preview } from "@/lib/labels";
import { ConfidenceDot, Tag } from "../Tag";
import styles from "./ResultsTable.module.css";

function Decision({ escalate }: { escalate: boolean }) {
  return escalate ? <Tag tone="warning">Person</Tag> : <Tag tone="success">Auto-reply</Tag>;
}

export function ResultsTable({ rows, threshold, onlyMistakes }: { rows: EvalRow[]; threshold: number; onlyMistakes: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const shown = rows
    .map((row) => ({ row, escalate: escalatesAt(row, threshold) }))
    .filter(({ row, escalate }) => !onlyMistakes || escalate !== row.should_escalate);

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Ticket</th>
            <th scope="col">Result</th>
            <th scope="col">Topic</th>
            <th scope="col">Confidence</th>
            <th scope="col">Should go to</th>
            <th scope="col">Nirnay sent it to</th>
            <th scope="col"><span className="visually-hidden">Details</span></th>
          </tr>
        </thead>
        <tbody>
          {shown.length === 0 && (
            <tr><td colSpan={7} className={styles.empty}>No mistakes at this threshold.</td></tr>
          )}
          {shown.map(({ row, escalate }) => {
            const right = escalate === row.should_escalate;
            const missed = row.should_escalate && !escalate;
            const topicRight = row.pred_categories.length === row.categories.length &&
              row.pred_categories.every((c) => row.categories.includes(c));
            const expanded = open === row.id;
            return (
              <Fragment key={row.id}>
                <tr className={`${styles.row} ${right ? "" : missed ? styles.missed : styles.extra}`}
                    onClick={() => setOpen(expanded ? null : row.id)}>
                  <td>
                    <div className={styles.ticket}>
                      <span className={styles.id}>{row.id}</span>
                      <span className={styles.preview} lang={row.language === "hi" ? "hi" : undefined}>{preview(row.text)}</span>
                    </div>
                  </td>
                  <td>
                    {right
                      ? <span className={styles.ok}><Check size={14} strokeWidth={2.6} aria-hidden="true" /> Correct</span>
                      : <span className={missed ? styles.bad : styles.warn}><X size={14} strokeWidth={2.6} aria-hidden="true" /> {missed ? "Missed" : "Extra"}</span>}
                  </td>
                  <td>{topicRight ? <span className={styles.muted}>Matches</span> : <span className={styles.warn}>Differs</span>}</td>
                  <td><ConfidenceDot level={confidenceLevel(row.min_confidence, threshold)} /></td>
                  <td><Decision escalate={row.should_escalate} /></td>
                  <td><Decision escalate={escalate} /></td>
                  <td>
                    <button className={styles.expand} aria-expanded={expanded} aria-label={`Details for ${row.id}`}
                            onClick={(e) => { e.stopPropagation(); setOpen(expanded ? null : row.id); }}>
                      <ChevronDown size={16} />
                    </button>
                  </td>
                </tr>
                {expanded && (
                  <tr className={styles.detailRow}>
                    <td colSpan={7}>
                      <div className={styles.detail}>
                        <p className={styles.full} lang={row.language === "hi" ? "hi" : undefined}>{row.text}</p>
                        <dl>
                          <dt>Label</dt>
                          <dd>{row.categories.map((c) => TOPIC_LABEL[c]).join(", ")}{row.needs_human_action && " · needs account change"}{row.at_risk && " · upset"} <span className={styles.muted}>({row.note})</span></dd>
                          <dt>Nirnay</dt>
                          <dd>{row.pred_categories.map((c) => TOPIC_LABEL[c]).join(", ")}{row.pred_needs_human && " · needs account change"}{row.pred_at_risk && " · upset"} · confidence {Math.round(row.min_confidence * 100)}%</dd>
                          {row.reasons.length > 0 && <><dt>Reasons</dt><dd>{row.reasons.join(" · ")}</dd></>}
                          {row.reply && <><dt>Draft</dt><dd className={styles.reply}>{row.reply}</dd></>}
                        </dl>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
