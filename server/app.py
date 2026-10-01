"""Nirnay's HTTP API. Thin on purpose: every decision lives in the triage package.

    uvicorn server.app:app --reload --port 8000
"""

import json
import os
from contextlib import asynccontextmanager
from typing import List, Literal, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, ConfigDict, Field

from server import demo, limits, store
from triage import config, kb, pipeline

load_dotenv()


@asynccontextmanager
async def lifespan(_: FastAPI):
    store.init()
    demo.load_into_store()
    yield


app = FastAPI(title="Nirnay API", version="1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("NIRNAY_WEB_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_NAMES = {
    "claude-opus-5-5": "Claude Opus 5.5",
    "claude-sonnet-5-5": "Claude Sonnet 5.5",
    "claude-haiku-4-5": "Claude Haiku 4.5",
    "baseline": "Keywords only",
}
RESULTS_DIR = config.ROOT / "eval" / "results"


def has_api_key() -> bool:
    return bool(os.environ.get("ANTHROPIC_API_KEY"))


def active_model() -> str:
    default = config.DEFAULT_MODEL if has_api_key() else "baseline"
    model = store.get_setting("model", default)
    return model if (model == "baseline" or has_api_key()) else "baseline"


def model_for_new_ticket(requested: str) -> str:
    """The AI model, unless today's AI budget is spent: then keywords (see server/limits.py)."""
    return requested if requested == "baseline" or limits.take_ai_call() else "baseline"


# ---------- settings ----------

class SettingsUpdate(BaseModel):
    threshold: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    model: Optional[str] = None


@app.get("/api/settings")
def get_settings() -> dict:
    return {
        "threshold": store.threshold(),
        "model": active_model(),
        "models": [{"id": m, "name": n, "available": m == "baseline" or has_api_key()}
                   for m, n in MODEL_NAMES.items()],
        "has_api_key": has_api_key(),
        "categories": config.CATEGORIES,
        "queue": store.queue_counts(),
        "ai_calls_left_today": limits.ai_calls_left() if has_api_key() else 0,
    }


@app.put("/api/settings")
def update_settings(update: SettingsUpdate) -> dict:
    if update.model is not None:
        if update.model not in MODEL_NAMES:
            raise HTTPException(400, f"Unknown model '{update.model}'")
        if update.model != "baseline" and not has_api_key():
            raise HTTPException(400, "No API key is configured, so only the keyword model is available.")
        store.set_setting("model", update.model)
    if update.threshold is not None:
        # Applies to new tickets. Tickets already answered stay answered, and tickets a person
        # already owns stay with them: a settings change never sends replies by itself.
        store.set_setting("threshold", f"{update.threshold:.2f}")
    return get_settings()


# ---------- inbox ----------

class NewTicket(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)  # "   " counts as empty
    text: str = Field(min_length=1, max_length=4000)
    channel: Literal["whatsapp", "email", "form"] = "whatsapp"
    student: str = Field(default="New student", max_length=80)


class Correction(BaseModel):
    categories: List[Literal["refund", "batch_access", "payment", "technical", "academic_doubt", "other"]] = Field(min_length=1)


class SendReply(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    reply: str = Field(min_length=1, max_length=4000)


@app.get("/api/tickets")
def list_tickets() -> list:
    return store.list_all()


@app.get("/api/tickets/{ticket_id}")
def get_ticket(ticket_id: str) -> dict:
    ticket = store.get(ticket_id)
    if not ticket:
        raise HTTPException(404, f"No ticket '{ticket_id}'")
    return ticket


@app.post("/api/tickets", status_code=201)
def create_ticket(body: NewTicket, request: Request) -> dict:
    """A new ticket arrives: triage it now and put it in the right queue."""
    limits.check_rate(request)
    student = body.student.strip() or store.ANONYMOUS
    received_at = store.now_iso()
    prior = store.prior_contacts(student, received_at)  # has this student written in the last 7 days?
    result = pipeline.run(body.text, model=model_for_new_ticket(active_model()), threshold=store.threshold(), prior_contacts=prior)
    ticket_id = store.next_live_id()
    store.add(ticket_id, student, body.channel, body.text, result, received_at=received_at, source="live", prior=prior)
    return store.get(ticket_id)


@app.post("/api/tickets/{ticket_id}/send")
def send_reply(ticket_id: str, body: SendReply) -> dict:
    """An agent approves (possibly after editing) the reply. Sending is simulated."""
    if not store.get(ticket_id):
        raise HTTPException(404, f"No ticket '{ticket_id}'")
    store.resolve(ticket_id, body.reply)
    return store.get(ticket_id)


@app.post("/api/tickets/{ticket_id}/correction")
def correct_topic(ticket_id: str, body: Correction) -> dict:
    """An agent fixes a wrong topic. Kept as a new label for the next evaluation round."""
    if not store.get(ticket_id):
        raise HTTPException(404, f"No ticket '{ticket_id}'")
    store.correct(ticket_id, body.categories)
    return store.get(ticket_id)


@app.post("/api/tickets/{ticket_id}/reopen")
def reopen(ticket_id: str) -> dict:
    """An agent says an automatic reply should have come to a person: back to Needs you, kept as a label."""
    ticket = store.get(ticket_id)
    if not ticket:
        raise HTTPException(404, f"No ticket '{ticket_id}'")
    if ticket["status"] != "auto_sent":
        raise HTTPException(400, "Only an automatically answered ticket can be reopened.")
    store.reopen(ticket_id)
    return store.get(ticket_id)


@app.get("/api/live-stats")
def live_stats() -> dict:
    return store.live_stats()


@app.get("/api/corrections")
def list_corrections() -> list:
    return [{"id": t["id"], "text": t["text"], "channel": t["channel"],
             "predicted": sorted({i["category"] for i in t["result"]["classification"]["issues"]}),
             "corrected": t["corrected_categories"], "corrected_at": t["corrected_at"],
             "reopened_at": t["reopened_at"]}
            for t in store.corrections()]


@app.get("/api/corrections.jsonl", response_class=PlainTextResponse)
def export_corrections() -> str:
    """Agent corrections in the same shape as data/tickets.jsonl, ready to label and add.
    A reopened automatic reply is labelled should_escalate: true."""
    rows = []
    for c in list_corrections():
        row = {"id": c["id"], "channel": c["channel"], "text": c["text"],
               "categories": c["corrected"] or c["predicted"], "source": "agent_correction"}
        if c["reopened_at"]:
            row["should_escalate"] = True
        rows.append(json.dumps(row, ensure_ascii=False))
    return "\n".join(rows)


# ---------- stateless triage: how PW's WhatsApp/email systems would call Nirnay ----------

class TriageRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    text: str = Field(min_length=1, max_length=4000)
    model: Optional[str] = None


@app.post("/api/triage")
def triage(body: TriageRequest, request: Request) -> dict:
    limits.check_rate(request)
    model = body.model or active_model()
    if model not in MODEL_NAMES:
        raise HTTPException(400, f"Unknown model '{model}'")
    if model != "baseline" and not has_api_key():
        raise HTTPException(400, "No API key is configured; use model 'baseline'.")
    return pipeline.run(body.text, model=model_for_new_ticket(model), threshold=store.threshold()).model_dump()


# ---------- knowledge base and evaluation ----------

@app.get("/api/kb")
def knowledge_base() -> list:
    return [s.__dict__ for s in kb.load_kb().values()]


@app.get("/api/eval/runs")
def eval_runs() -> list:
    runs = []
    for path in sorted(RESULTS_DIR.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        if not {"model", "split", "summary"} <= data.keys():  # not an evaluation run: skip, never crash
            continue
        runs.append({"name": path.stem, "model": data["model"],
                     "model_name": MODEL_NAMES.get(data["model"], data["model"]),
                     "split": data["split"], "summary": data["summary"]})
    return runs


@app.get("/api/eval/runs/{name}")
def eval_run(name: str) -> dict:
    path = RESULTS_DIR / f"{name}.json"
    if not path.is_file() or path.parent != RESULTS_DIR:
        raise HTTPException(404, f"No evaluation run '{name}'")
    data = json.loads(path.read_text(encoding="utf-8"))
    data["name"] = name
    data["model_name"] = MODEL_NAMES.get(data["model"], data["model"])
    for row in data["rows"]:
        # Every part of the escalation rule except the confidence check. The UI adds
        # "min_confidence < threshold" itself, so the threshold can be dragged live.
        row["fixed_escalate"] = bool(
            row["pred_at_risk"] or row["pred_needs_human"] or row["citation_issues"]
            or row["error"] or set(row["pred_categories"]) & config.ALWAYS_ESCALATE_CATEGORIES)
    return data
