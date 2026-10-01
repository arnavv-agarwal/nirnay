"use client";

// The only material Nirnay may cite. Each article says whether it is official PW
// policy (with its pw.live source) or assumed for this prototype.
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { api, cached, type Section } from "@/lib/api";
import { Tag } from "@/components/Tag";
import { KB_DOCS as DOCS, sourceOf as source } from "@/lib/labels";
import styles from "./knowledge.module.css";

const TONE = { official: "success", product: "primary", reports: "warning", assumed: "neutral" } as const;

export default function KnowledgePage() {
  const [sections, setSections] = useState<Section[] | null>(() => cached<Section[]>("/api/kb") ?? null);  // instant when already loaded
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [doc, setDoc] = useState<string>("all");

  useEffect(() => { api.kb().then(setSections, (e: Error) => setError(e.message)); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (sections ?? []).filter((s) => (doc === "all" || s.doc === doc) &&
      (!q || `${s.id} ${s.title} ${s.text}`.toLowerCase().includes(q)));
  }, [sections, query, doc]);

  const official = sections?.filter((s) => source(s.source).kind === "official").length ?? 0;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Knowledge base</h1>
        <p className={styles.lede}>
          Nirnay drafts replies only from these articles and cites each one it uses.
          {sections && <> {official} of {sections.length} are PW&apos;s official policies, each linked to the PW page it came from; the rest are labelled as product info, public reports or assumptions for this prototype.</>}
        </p>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Search size={15} aria-hidden="true" />
          <span className="visually-hidden">Search articles</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search refund, OTP, EMI, RF-2…" />
        </label>
        <div className={styles.chips} role="tablist" aria-label="Document">
          {[["all", "All"], ...Object.entries(DOCS)].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={doc === id} className={`${styles.chip} ${doc === id ? styles.chipOn : ""}`} onClick={() => setDoc(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {!sections && !error && <div className={styles.loading}><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /></div>}
      {sections && filtered.length === 0 && <p className={styles.none}>No article matches “{query}”.</p>}

      <div className={styles.grid}>
        {filtered.map((s) => {
          const src = source(s.source);
          return (
            <article key={s.id} id={s.id} className={`card ${styles.article}`}>
              <h2 className={styles.articleTitle}>{s.title}</h2>
              <p className={styles.text}>{s.text}</p>
              <footer className={styles.articleFoot}>
                <span className={styles.meta}>
                  <span className={styles.id}>{s.id}</span>
                  <Tag tone={TONE[src.kind]}>{src.label}</Tag>
                </span>
                {src.url && (
                  <a href={src.url} target="_blank" rel="noreferrer" className={styles.link}>
                    {new URL(src.url).hostname.replace("www.", "")} <ExternalLink size={12} aria-hidden="true" />
                  </a>
                )}
              </footer>
            </article>
          );
        })}
      </div>
    </main>
  );
}
