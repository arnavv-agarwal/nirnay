"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Gauge, Inbox } from "lucide-react";
import { useSettings } from "./SettingsProvider";
import { Logo } from "./Logo";
import styles from "./Sidebar.module.css";

const NAV = [
  { href: "/", label: "Inbox", icon: Inbox, hint: "Agents" },
  { href: "/quality", label: "Quality", icon: Gauge, hint: "Team lead" },
  { href: "/knowledge", label: "Knowledge base", icon: BookOpen, hint: "What Nirnay can cite" },
];

export function Sidebar() {
  const path = usePathname();
  const { settings, error } = useSettings();
  const model = settings?.models.find((m) => m.id === settings.model);

  return (
    <aside className={styles.sidebar}>
      <Link href="/" className={styles.brand} aria-label="Nirnay home">
        <Logo />
        <span className={styles.brandText}>
          <span className={styles.name}>Nirnay</span>
          <span className={styles.tagline}>Support Triage</span>
        </span>
      </Link>

      <nav className={styles.nav} aria-label="Main">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link key={href} href={href} className={`${styles.link} ${active ? styles.active : ""}`}
                  aria-current={active ? "page" : undefined}>
              <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
              <span>{label}</span>
              {href === "/" && settings && settings.queue.needs_you > 0 && (
                <em className={styles.badge} aria-label={`${settings.queue.needs_you} tickets need you`}>{settings.queue.needs_you}</em>
              )}
            </Link>
          );
        })}
      </nav>

      {settings && settings.queue.urgent > 0 && (
        <Link href="/" className={styles.urgent}>
          <span className={styles.urgentDot} aria-hidden="true" /> {settings.queue.urgent} urgent
        </Link>
      )}

      <div className={styles.foot}>
        {error ? (
          <p className={styles.offline}>API offline</p>
        ) : settings ? (
          <dl className={styles.status}>
            <div>
              <dt>AI model</dt>
              <dd>{settings.has_api_key ? model?.name : "Keyword mode"}</dd>
            </div>
            {!settings.has_api_key && <p className={styles.note}>No API key yet: tickets are sorted by keywords and no replies are drafted.</p>}
            {settings.has_api_key && settings.model !== "baseline" && settings.ai_calls_left_today === 0 && (
              <p className={styles.note}>Today&apos;s AI budget for this demo is used up: new tickets are sorted by keywords until tomorrow.</p>
            )}
          </dl>
        ) : (
          <span className={`skeleton ${styles.loading}`} />
        )}
        <p className={styles.built}>Built for PW Support · Prototype</p>
      </div>
    </aside>
  );
}
