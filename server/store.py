"""The inbox, stored in SQLite so an agent's actions survive a page reload.

One table of tickets (each with its full triage result as JSON) and one table of
settings (the live confidence threshold and model).
"""

import json
import os
import sqlite3
from pathlib import Path
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from typing import Iterator, List, Optional

from triage import config, sources
from triage.pipeline import TriageResult, finalize

# A hosted container may only be able to write to /tmp, so the path can be set (see Dockerfile).
DB_PATH = Path(os.environ.get("NIRNAY_DB", config.ROOT / "data" / "nirnay.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS tickets (
    id           TEXT PRIMARY KEY,
    student      TEXT NOT NULL,
    channel      TEXT NOT NULL,
    text         TEXT NOT NULL,
    received_at  TEXT NOT NULL,
    status       TEXT NOT NULL,   -- urgent | needs_review | auto_sent | resolved
    result       TEXT NOT NULL,   -- TriageResult as JSON
    final_reply  TEXT,
    resolved_at  TEXT,
    source       TEXT NOT NULL,   -- demo | live
    corrected_categories TEXT,    -- JSON list set by an agent who fixed the topic
    corrected_at TEXT,
    prior_contacts INTEGER NOT NULL DEFAULT 0, -- other tickets from this student in the repeat window
    reopened_at  TEXT             -- an agent said an automatic reply should have come to a person
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
"""


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init() -> None:
    with connect() as conn:
        conn.executescript(SCHEMA)


def status_for(result: TriageResult) -> str:
    """The queue a ticket lands in follows directly from the decision."""
    if not result.decision.escalate:
        return "auto_sent"
    return "urgent" if result.decision.priority == "urgent" else "needs_review"


# ---------- settings ----------

def get_setting(key: str, default: str) -> str:
    with connect() as conn:
        row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    return row["value"] if row else default


def set_setting(key: str, value: str) -> None:
    with connect() as conn:
        conn.execute("INSERT INTO settings (key, value) VALUES (?, ?) "
                     "ON CONFLICT(key) DO UPDATE SET value = excluded.value", (key, value))


def threshold() -> float:
    return float(get_setting("threshold", str(config.CONFIDENCE_THRESHOLD)))


# ---------- tickets ----------

ANONYMOUS = "New student"  # a placeholder name is never treated as the same person


def prior_contacts(student: str, received_at: str) -> int:
    """Tickets this student sent in the repeat window up to now (call it before adding the new one).
    (A real deployment would match on phone number or email; the demo matches on name.)"""
    if student == ANONYMOUS:
        return 0
    since = (datetime.fromisoformat(received_at) - timedelta(days=config.REPEAT_WINDOW_DAYS)).isoformat(timespec="seconds")
    with connect() as conn:
        return conn.execute("SELECT COUNT(*) FROM tickets WHERE student = ? AND received_at >= ? AND received_at <= ?",
                            (student, since, received_at)).fetchone()[0]


def add(ticket_id: str, student: str, channel: str, text: str, result: TriageResult,
        received_at: Optional[str] = None, source: str = "live", prior: int = 0) -> None:
    with connect() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO tickets (id, student, channel, text, received_at, status, result, source, prior_contacts) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (ticket_id, student, channel, text, received_at or now_iso(), status_for(result),
             result.model_dump_json(), source, prior))


def _row_to_dict(row: sqlite3.Row) -> dict:
    ticket = dict(row)
    ticket["result"] = json.loads(ticket["result"])
    ticket["corrected_categories"] = json.loads(ticket["corrected_categories"] or "null")
    # The agent's reply as the student got it: numbered sources instead of [IDs].
    ticket["final_student_reply"] = (sources.for_student(ticket["final_reply"], ticket["result"]["classification"]["language"])
                                     if ticket["final_reply"] else None)
    return ticket


def list_all() -> List[dict]:
    with connect() as conn:
        rows = conn.execute("SELECT * FROM tickets ORDER BY received_at DESC").fetchall()
    return [_row_to_dict(r) for r in rows]


def get(ticket_id: str) -> Optional[dict]:
    with connect() as conn:
        row = conn.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
    return _row_to_dict(row) if row else None


def resolve(ticket_id: str, reply: str) -> None:
    with connect() as conn:
        conn.execute("UPDATE tickets SET status = 'resolved', final_reply = ?, resolved_at = ? "
                     "WHERE id = ?", (reply, now_iso(), ticket_id))


def correct(ticket_id: str, categories: List[str]) -> None:
    """An agent says Nirnay got the topic wrong. Stored as a new label, never silently applied."""
    with connect() as conn:
        conn.execute("UPDATE tickets SET corrected_categories = ?, corrected_at = ? WHERE id = ?",
                     (json.dumps(sorted(categories)), now_iso(), ticket_id))


def reopen(ticket_id: str) -> None:
    """An agent says an automatic reply should have come to a person. The reply was already
    sent, so the ticket goes back to Needs you for a follow-up, and the call is kept as a label."""
    with connect() as conn:
        conn.execute("UPDATE tickets SET status = 'needs_review', reopened_at = ? WHERE id = ? AND status = 'auto_sent'",
                     (now_iso(), ticket_id))


def corrections() -> List[dict]:
    """Agents' corrections: a wrong topic, or an automatic reply that should have come to a person."""
    with connect() as conn:
        rows = conn.execute("SELECT * FROM tickets WHERE corrected_categories IS NOT NULL OR reopened_at IS NOT NULL "
                            "ORDER BY max(coalesce(corrected_at, ''), coalesce(reopened_at, '')) DESC").fetchall()
    return [_row_to_dict(r) for r in rows]


def queue_counts() -> dict:
    with connect() as conn:
        rows = conn.execute("SELECT status, COUNT(*) AS n FROM tickets GROUP BY status").fetchall()
    by_status = {r["status"]: r["n"] for r in rows}
    return {"needs_you": by_status.get("urgent", 0) + by_status.get("needs_review", 0),
            "urgent": by_status.get("urgent", 0)}


def live_stats() -> dict:
    """Honest live numbers from the inbox itself (not the labelled test set):
    how many automatic replies the student came back about, and how often agents
    had to correct the topic."""
    tickets = list_all()
    window = timedelta(days=config.REPEAT_WINDOW_DAYS)
    by_student = {}
    for t in tickets:
        by_student.setdefault(t["student"], []).append(t)
    auto = [t for t in tickets if t["status"] == "auto_sent" or t["reopened_at"]]
    came_back = [t for t in auto if t["student"] != ANONYMOUS and any(
        o["id"] != t["id"] and t["received_at"] < o["received_at"] <= (datetime.fromisoformat(t["received_at"]) + window).isoformat()
        for o in by_student[t["student"]])]
    handled = [t for t in tickets if t["status"] in ("resolved", "auto_sent")]
    corrected = [t for t in tickets if t["corrected_categories"]]
    reopened = [t for t in tickets if t["reopened_at"]]
    return {
        "tickets": len(tickets),
        "auto_replied": len(auto),
        "came_back_after_auto_reply": len(came_back),
        "came_back_ids": [t["id"] for t in came_back],
        "repeat_contacts": sum(1 for t in tickets if t["prior_contacts"]),
        "corrections": len(corrected),
        "reopened": len(reopened),
        "handled": len(handled),
    }


def count() -> int:
    with connect() as conn:
        return conn.execute("SELECT COUNT(*) FROM tickets").fetchone()[0]


def next_live_id() -> str:
    with connect() as conn:
        n = conn.execute("SELECT COUNT(*) FROM tickets WHERE source = 'live'").fetchone()[0]
    return f"live-{n + 1:03d}"
