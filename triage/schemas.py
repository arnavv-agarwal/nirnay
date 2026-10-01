"""Data shapes passed between pipeline steps. Pydantic validates every model output."""

from typing import List, Literal

from pydantic import BaseModel, ConfigDict

Category = Literal["refund", "batch_access", "payment", "technical", "academic_doubt", "other"]
Language = Literal["en", "hinglish", "hi"]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Issue(Strict):
    category: Category
    confidence: float  # 0.0 to 1.0, self-reported by the model


class Classification(Strict):
    issues: List[Issue]
    needs_human_action: bool
    needs_human_reason: str
    at_risk: bool
    at_risk_reason: str
    language: Language
    summary: str  # one-line English summary for the support agent

    @property
    def categories(self) -> List[str]:
        return sorted({issue.category for issue in self.issues})

    @property
    def min_confidence(self) -> float:
        return min((issue.confidence for issue in self.issues), default=0.0)


class Draft(Strict):
    reply: str


ReasonCode = Literal["at_risk", "needs_action", "out_of_scope", "low_confidence", "citation_failed", "ai_failed",
                     "repeat_contact"]


class Detail(Strict):
    kind: str    # "Order ID", "Transaction ref", "Amount", "Batch", "Centre"
    value: str


class Decision(Strict):
    escalate: bool
    priority: Literal["urgent", "normal", "none"]
    reasons: List[str]               # human-readable, with the specifics
    codes: List[ReasonCode] = []     # which rule fired, so the UI can phrase it for agents


class Usage(Strict):
    input_tokens: int = 0
    output_tokens: int = 0
    cost_usd: float = 0.0
    latency_s: float = 0.0

    def __add__(self, other: "Usage") -> "Usage":
        return Usage(
            input_tokens=self.input_tokens + other.input_tokens,
            output_tokens=self.output_tokens + other.output_tokens,
            cost_usd=self.cost_usd + other.cost_usd,
            latency_s=self.latency_s + other.latency_s,
        )
