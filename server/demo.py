"""The demo inbox: the 156 synthetic labelled tickets, triaged once and saved.

Triaging them on every server start would cost money and time, so this script
runs the pipeline once and writes data/demo_queue.json. The server loads that
file into an empty database.

    python -m server.demo --model baseline
    python -m server.demo --model claude-opus-5-5
"""

import argparse
import json
import random
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv

from server import store
from triage import config, pipeline
from triage.pipeline import TriageResult, finalize

TICKETS = config.ROOT / "data" / "tickets.jsonl"
DEMO_QUEUE = config.ROOT / "data" / "demo_queue.json"

# Synthetic names so the demo inbox reads like a real one. Not real students.
FIRST = ["Aarav", "Ananya", "Vivaan", "Diya", "Aditya", "Ishita", "Arjun", "Saanvi", "Kabir", "Meera",
         "Rohan", "Priya", "Yash", "Kavya", "Harsh", "Nisha", "Aman", "Riya", "Kunal", "Sneha",
         "Dev", "Pooja", "Tanmay", "Aisha", "Rahul", "Simran", "Karthik", "Neha", "Farhan", "Jhanvi"]
LAST = "SKMPRAGDTVNBJ"

# Students who write twice about the same problem, so the repeat-contact rule is
# visible in the demo. (earlier ticket, later ticket)
REPEAT_PAIRS = [("test-07", "test-95"), ("dev-01", "test-39"),
                ("test-14", "test-33")]  # auto-replied about buffering, came back angry


def build(model: str) -> None:
    tickets = [json.loads(l) for l in TICKETS.read_text(encoding="utf-8").splitlines() if l]
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda t: pipeline.run(t["text"], model=model), tickets))

    rng = random.Random(7)  # fixed seed: the demo inbox looks the same every time
    minutes = rng.sample(range(2, 2 * 24 * 60), len(tickets))           # spread over 2 days
    names = rng.sample([f"{f} {l}." for f in FIRST for l in LAST], len(tickets))  # unique per ticket
    entries = {t["id"]: {"id": t["id"], "student": n, "channel": t["channel"], "text": t["text"],
                         "minutes_ago": m, "result": r.model_dump()}
               for t, r, m, n in zip(tickets, results, minutes, names)}
    for first, later in REPEAT_PAIRS:  # same student; the later message comes a day after the first
        entries[later]["student"] = entries[first]["student"]
        entries[later]["minutes_ago"] = max(2, entries[first]["minutes_ago"] - 24 * 60)
    entries = list(entries.values())
    DEMO_QUEUE.write_text(json.dumps({"model": model, "tickets": entries}, indent=1,
                                     ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(entries)} triaged tickets to {DEMO_QUEUE.name} using {model}")


def load_into_store() -> int:
    """Fills an empty inbox from demo_queue.json. Returns how many tickets were added."""
    if store.count() or not DEMO_QUEUE.exists():
        return 0
    data = json.loads(DEMO_QUEUE.read_text(encoding="utf-8"))
    now = datetime.now(timezone.utc)
    threshold = store.threshold()
    # Oldest first, so each ticket's repeat count only sees the tickets before it.
    for entry in sorted(data["tickets"], key=lambda e: -e["minutes_ago"]):
        received = (now - timedelta(minutes=entry["minutes_ago"])).isoformat(timespec="seconds")
        prior = store.prior_contacts(entry["student"], received)
        result = finalize(TriageResult.model_validate(entry["result"]), threshold, prior)
        store.add(entry["id"], entry["student"], entry["channel"], entry["text"], result,
                  received_at=received, source="demo", prior=prior)
    return len(data["tickets"])


if __name__ == "__main__":
    load_dotenv()
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="baseline")
    build(parser.parse_args().model)
