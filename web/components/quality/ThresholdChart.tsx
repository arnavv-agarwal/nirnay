"use client";

// Precision, recall and auto-reply rate across every threshold, from the labelled test set.
// Drag the handle (or use the slider / arrow keys) to choose a threshold; hover to read any point.
// Drawn at its real pixel width so text stays legible on any screen.
import { useEffect, useRef, useState } from "react";
import type { Marks } from "@/lib/remark";
import { pct } from "@/lib/labels";
import styles from "./ThresholdChart.module.css";

const H = 250;
const PAD = { top: 14, right: 92, bottom: 30, left: 40 };

const SERIES = [
  { key: "recall", name: "Escalation recall", color: "var(--series-1)", help: "Tickets that needed a person and got one" },
  { key: "precision", name: "Escalation precision", color: "var(--series-2)", help: "Escalations that truly needed a person" },
  { key: "autoReplyRate", name: "Auto-reply rate", color: "var(--series-3)", help: "Tickets Nirnay answered alone" },
] as const;

export function ThresholdChart({ points, value, onChange }: { points: Marks[]; value: number; onChange: (t: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setW(Math.max(300, Math.round(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const plotW = W - PAD.left - PAD.right;
  const x = (t: number) => PAD.left + t * plotW;
  const y = (v: number) => PAD.top + (1 - v) * (H - PAD.top - PAD.bottom);
  const at = (t: number) => points.reduce((best, p) => (Math.abs(p.threshold - t) < Math.abs(best.threshold - t) ? p : best), points[0]);
  const current = at(value);
  const hovered = hover === null ? null : at(hover);
  const last = points[points.length - 1];

  function toThreshold(clientX: number) {
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return null;
    return Math.round(Math.min(1, Math.max(0, (clientX - rect.left - PAD.left) / plotW)) * 100) / 100;
  }

  // Direct labels at the right end, nudged apart so they never overlap.
  const labelYs = SERIES.map((s) => ({ key: s.key, y: y(last[s.key]) }))
    .sort((a, b) => a.y - b.y)
    .reduce<{ key: string; y: number }[]>((acc, l) => [...acc, { ...l, y: Math.max(l.y, (acc.at(-1)?.y ?? -99) + 14) }], []);

  return (
    <figure className={styles.figure}>
      <div ref={box} className={styles.box}>
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          className={styles.svg}
          role="img"
          aria-label={`At threshold ${value.toFixed(2)}: recall ${pct(current.recall)}, precision ${pct(current.precision)}, auto-reply rate ${pct(current.autoReplyRate)}`}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); const t = toThreshold(e.clientX); if (t !== null) onChange(t); }}
          onPointerMove={(e) => { const t = toThreshold(e.clientX); if (t === null) return; if (e.buttons === 1) onChange(t); else setHover(t); }}
          onPointerLeave={() => setHover(null)}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <g key={v}>
              <line className={styles.grid} x1={PAD.left} x2={PAD.left + plotW} y1={y(v)} y2={y(v)} />
              <text className={styles.axis} x={PAD.left - 8} y={y(v) + 4} textAnchor="end">{pct(v)}</text>
            </g>
          ))}
          {(W < 460 ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1]).filter((v) => Math.abs(x(v) - x(value)) > 28).map((v) => (
            <text key={v} className={styles.axis} x={x(v)} y={H - 10} textAnchor="middle">{v.toFixed(2)}</text>
          ))}

          {SERIES.map((s) => (
            <polyline key={s.key} className={styles.line} style={{ stroke: s.color }}
                      points={points.map((p) => `${x(p.threshold)},${y(p[s.key])}`).join(" ")} />
          ))}

          {labelYs.map((l) => {
            const s = SERIES.find((x) => x.key === l.key)!;
            return <text key={l.key} className={styles.direct} x={PAD.left + plotW + 8} y={l.y + 4}>{s.name.replace("Escalation ", "")}</text>;
          })}

          {hovered && Math.abs(hovered.threshold - value) > 0.01 && (
            <g className={styles.ghost} transform={`translate(${x(hovered.threshold)},0)`}>
              <line y1={PAD.top} y2={y(0)} />
              {SERIES.map((s) => <circle key={s.key} cy={y(hovered[s.key])} r={4} style={{ fill: s.color }} />)}
            </g>
          )}

          <g className={styles.handle} transform={`translate(${x(value)},0)`}>
            <line y1={PAD.top - 4} y2={y(0)} />
            {SERIES.map((s) => <circle key={s.key} cy={y(current[s.key])} r={5} style={{ fill: s.color }} />)}
            <rect x={-22} y={y(0) + 4} width={44} height={20} rx={10} />
            <text y={y(0) + 18} textAnchor="middle">{value.toFixed(2)}</text>
          </g>
        </svg>

        {hovered && Math.abs(hovered.threshold - value) > 0.01 && (
          <div className={styles.tooltip} style={{ left: Math.min(x(hovered.threshold) + 12, W - 190), top: 8 }}>
            <strong>Threshold {hovered.threshold.toFixed(2)}</strong>
            {SERIES.map((s) => (
              <span key={s.key}><i style={{ background: s.color }} />{s.name}: {pct(hovered[s.key])}</span>
            ))}
            <span className={styles.tipMuted}>{hovered.missed} missed · click to select</span>
          </div>
        )}
      </div>

      <label className={styles.slider}>
        <span>Threshold</span>
        <input type="range" min={0} max={1} step={0.01} value={value} onChange={(e) => onChange(Number(e.target.value))}
               aria-valuetext={`${value.toFixed(2)}: ${current.missed} missed escalations, ${pct(current.autoReplyRate)} auto-replied`} />
        <output>{value.toFixed(2)}</output>
      </label>

      <figcaption className={styles.legend}>
        {SERIES.map((s) => (
          <span key={s.key} className={styles.legendItem}>
            <i style={{ background: s.color }} aria-hidden="true" />
            <strong>{pct(current[s.key])}</strong>
            <span>{s.name} <span className={styles.legendHelp}>· {s.help}</span></span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
