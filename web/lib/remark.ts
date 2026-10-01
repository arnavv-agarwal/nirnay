// Re-marks a saved evaluation run at any threshold, instantly, in the browser.
// The server already decided every part of the escalation rule except the
// confidence check (row.fixed_escalate), so the only threshold-dependent part is:
//     escalate = fixed_escalate OR min_confidence < threshold
import type { EvalRow } from "./api";

export function escalatesAt(row: EvalRow, threshold: number): boolean {
  return row.fixed_escalate || row.min_confidence < threshold;
}

export interface Marks {
  threshold: number;
  correct: number;
  total: number;
  missed: number;      // needed a person, got an auto-reply: the costly mistake
  unneeded: number;    // went to a person without needing one: costs agent time
  precision: number;
  recall: number;
  autoReplyRate: number;
}

export function markAt(rows: EvalRow[], threshold: number): Marks {
  let tp = 0, fp = 0, fn = 0, auto = 0, correct = 0;
  for (const row of rows) {
    const escalate = escalatesAt(row, threshold);
    if (escalate && row.should_escalate) tp++;
    if (escalate && !row.should_escalate) fp++;
    if (!escalate && row.should_escalate) fn++;
    if (!escalate) auto++;
    if (escalate === row.should_escalate) correct++;
  }
  const n = rows.length || 1;
  return {
    threshold,
    correct,
    total: rows.length,
    missed: fn,
    unneeded: fp,
    precision: tp + fp ? tp / (tp + fp) : 1,
    recall: tp + fn ? tp / (tp + fn) : 1,
    autoReplyRate: auto / n,
  };
}

export function sweep(rows: EvalRow[], step = 0.01): Marks[] {
  const points: Marks[] = [];
  for (let t = 0; t <= 1.0001; t += step) points.push(markAt(rows, Math.round(t * 100) / 100));
  return points;
}
