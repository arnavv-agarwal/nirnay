// Pill tags. Status tags always carry an icon + words, never colour alone.
import { AlertTriangle, CheckCircle2, Clock, Flame, SignalHigh, SignalLow, SignalMedium } from "lucide-react";
import type { Status } from "@/lib/api";
import { STATUS_LABEL } from "@/lib/labels";
import styles from "./Tag.module.css";

type Tone = "neutral" | "primary" | "error" | "warning" | "success";

export function Tag({ tone = "neutral", children, title }: { tone?: Tone; children: React.ReactNode; title?: string }) {
  return <span className={`${styles.tag} ${styles[tone]}`} title={title}>{children}</span>;
}

const STATUS_TONE: Record<Status, Tone> = { urgent: "error", needs_review: "warning", auto_sent: "success", resolved: "neutral" };
const STATUS_ICON = { urgent: Flame, needs_review: Clock, auto_sent: CheckCircle2, resolved: CheckCircle2 };

export function StatusTag({ status }: { status: Status }) {
  const Icon = STATUS_ICON[status];
  return (
    <Tag tone={STATUS_TONE[status]}>
      <Icon size={12} strokeWidth={2.4} aria-hidden="true" /> {STATUS_LABEL[status]}
    </Tag>
  );
}

export function RiskTag() {
  return <Tag tone="error"><AlertTriangle size={12} strokeWidth={2.4} aria-hidden="true" /> Upset</Tag>;
}

const SIGNAL = { High: SignalHigh, Medium: SignalMedium, Low: SignalLow };

// Confidence in neutral ink: the signal bars carry the level, never a status colour.
export function ConfidenceDot({ level }: { level: "High" | "Medium" | "Low" }) {
  const Icon = SIGNAL[level];
  return (
    <span className={styles.conf} title={`${level} confidence`}>
      <Icon size={14} strokeWidth={2.4} aria-hidden="true" /> {level}
    </span>
  );
}
