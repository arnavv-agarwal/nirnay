"""Protects the public demo's API budget. Plain in-memory counters: one server process,
nothing to install, reset on restart.

Two limits, both only on the endpoints that call the AI:
- per visitor: at most PER_MINUTE new tickets a minute, else HTTP 429;
- per day: at most DAILY_AI_CALLS AI triages across everyone. After that, new tickets
  are still triaged, by the keyword model, so the demo keeps working and the bill stops.
"""

import os
import time
from collections import defaultdict, deque
from datetime import date
from typing import Deque, Dict

from fastapi import HTTPException, Request

PER_MINUTE = int(os.environ.get("NIRNAY_PER_MINUTE", "10"))
DAILY_AI_CALLS = int(os.environ.get("NIRNAY_DAILY_AI_CALLS", "100"))  # at most about $3 a day on Opus 5.5

_recent: Dict[str, Deque[float]] = defaultdict(deque)
_day = {"date": date.today(), "used": 0}


def visitor(request: Request) -> str:
    # Behind a host's proxy (Hugging Face, Vercel) the real address is the first forwarded one.
    forwarded = request.headers.get("x-forwarded-for", "")
    return forwarded.split(",")[0].strip() or (request.client.host if request.client else "unknown")


def check_rate(request: Request) -> None:
    """Raise 429 if this visitor sent more than PER_MINUTE tickets in the last minute."""
    now, times = time.monotonic(), _recent[visitor(request)]
    while times and now - times[0] > 60:
        times.popleft()
    if len(times) >= PER_MINUTE:
        raise HTTPException(429, f"Too many new tickets from you in a minute (limit {PER_MINUTE}). Wait a moment and try again.")
    times.append(now)


def take_ai_call() -> bool:
    """Count one AI triage against today's budget. False once the budget is used up."""
    if _day["date"] != date.today():
        _day.update(date=date.today(), used=0)
    if _day["used"] >= DAILY_AI_CALLS:
        return False
    _day["used"] += 1
    return True


def ai_calls_left() -> int:
    return DAILY_AI_CALLS - _day["used"] if _day["date"] == date.today() else DAILY_AI_CALLS
