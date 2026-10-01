"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpDown, Check, Layers, SlidersHorizontal, X } from "lucide-react";
import type { Ticket } from "@/lib/api";
import {
  FILTER_OPTIONS, NO_FILTERS, SORTS, activeFilterCount, countMatching, matchesFilters, optionLabel, toggleFilter,
  type FilterGroup, type Filters, type Sort,
} from "@/lib/queue";
import styles from "./QueueControls.module.css";

interface Props {
  sort: Sort;
  onSort: (s: Sort) => void;
  filters: Filters;
  onFilters: (f: Filters) => void;
  scoped: Ticket[];   // tickets in the current queue before filters, for the counts on each option
  batches: { id: string; label: string; pattern: boolean }[];  // every batch or centre named (lib/queue.ts)
}

// Sort and filter for the ticket list: one sort, any number of filters, active ones always visible.
export function QueueControls({ sort, onSort, filters, onFilters, scoped, batches }: Props) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const active = activeFilterCount(filters);

  // Close the panel on Escape or a click outside it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, [open]);

  // The batch-or-centre group comes from the tickets themselves, after "Needs attention".
  const groups = [
    ...FILTER_OPTIONS.slice(0, 2),
    { group: "batches" as FilterGroup, title: "Batch or centre", options: batches },
    ...FILTER_OPTIONS.slice(2),
  ];

  const chips = (Object.keys(filters) as FilterGroup[]).flatMap((group) =>
    (filters[group] as string[]).map((id) => ({ group, id, label: optionLabel(group, id) })));

  return (
    <div className={styles.wrap} ref={wrap}>
      <div className={styles.bar}>
        <label className={styles.sort}>
          <ArrowUpDown size={14} aria-hidden="true" />
          <span className="visually-hidden">Sort tickets</span>
          <select value={sort} onChange={(e) => onSort(e.target.value as Sort)}>
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <button className={`${styles.filterBtn} ${active ? styles.filterOn : ""}`} onClick={() => setOpen((o) => !o)}
                aria-expanded={open} aria-controls="filter-panel">
          <SlidersHorizontal size={14} aria-hidden="true" /> Filter
          {active > 0 && <span className={styles.badge}>{active}</span>}
        </button>
      </div>

      {open && (
        <div id="filter-panel" className={styles.panel} role="group" aria-label="Filter tickets">
          {groups.map(({ group, title, options }) => {
            // Each count is what clicking would show, given the filters already chosen in the other groups.
            const base = scoped.filter((t) => matchesFilters(t, { ...filters, [group]: [] }));
            // Batches not named in this queue are left out rather than shown greyed: the list could be long.
            // Patterns first, then by the count shown here.
            const count = (id: string) => countMatching(base, group, id);
            const shown = group === "batches"
              ? batches.filter((o) => count(o.id) > 0 || filters.batches.includes(o.id))
                  .sort((x, y) => Number(y.pattern) - Number(x.pattern) || count(y.id) - count(x.id) || x.label.localeCompare(y.label))
              : options;
            if (shown.length === 0) return null;
            return (
            <fieldset key={group} className={styles.group}>
              <legend>{title}</legend>
              {group === "batches" && batches.some((b) => b.pattern) && (
                <p className={styles.hint}><Layers size={12} aria-hidden="true" /> 3+ tickets in a day: may be one cause</p>
              )}
              <div className={styles.pills}>
                {shown.map((o) => {
                  const on = (filters[group] as string[]).includes(o.id);
                  const n = countMatching(base, group, o.id);
                  const pattern = "pattern" in o && Boolean(o.pattern);
                  return (
                    <button key={o.id} className={`${styles.pill} ${on ? styles.pillOn : ""}`} aria-pressed={on}
                            disabled={!on && n === 0} onClick={() => onFilters(toggleFilter(filters, group, o.id))}
                            title={pattern ? "3 or more tickets about this in a day: it may be one cause" : undefined}>
                      {on ? <Check size={13} aria-hidden="true" /> : pattern && <Layers size={13} className={styles.patternIcon} aria-label="Possible common cause" />}
                      {o.label} <span className={styles.n}>{n}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            );
          })}
          <div className={styles.panelFoot}>
            <button className="btn btn-ghost btn-sm" onClick={() => onFilters(NO_FILTERS)} disabled={!active}>Clear all</button>
            <button className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      )}

      {chips.length > 0 && (
        <div className={styles.chips} aria-label="Active filters">
          {chips.map((c) => (
            <button key={c.group + c.id} className={styles.chip} onClick={() => onFilters(toggleFilter(filters, c.group, c.id))}
                    aria-label={`Remove filter: ${c.label}`}>
              {c.label} <X size={12} aria-hidden="true" />
            </button>
          ))}
          <button className={styles.clear} onClick={() => onFilters(NO_FILTERS)}>Clear all</button>
        </div>
      )}
    </div>
  );
}
