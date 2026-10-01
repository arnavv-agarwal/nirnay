"""Keyword classifier with no AI model.

Two jobs:
1. A comparison point: the eval reports how much the model adds over simple keywords.
2. A fallback: if the model API fails, the pipeline still classifies, and escalates.

The keyword lists use generic support vocabulary (English and common Hinglish), not
phrases copied from the test tickets, so the comparison stays fair.
"""

import re
from typing import Dict, List

from triage.schemas import Classification, Issue

KEYWORDS: Dict[str, List[str]] = {
    "refund": [r"refund", r"cancel", r"money back", r"paisa wapas", r"return", r"transfer",
               r"change (my |the |it)?batch", r"batch change", r"replace", r"damaged"],
    "batch_access": [r"\bbatch", r"my batches", r"not (showing|visible)", r"nahi dikh",
                     r"dikh nahi", r"expir", r"validity", r"block", r"login", r"device",
                     r"notes", r"lectures?\b", r"बैच", r"अकाउंट"],
    "payment": [r"payment", r"\bpaid\b", r"\bpay\b", r"debit", r"deduct", r"kat gay", r"charged",
                r"\bupi\b", r"\bemi\b", r"invoice", r"receipt", r"coupon", r"\bgst\b",
                r"transaction"],
    "technical": [r"crash", r"\botp\b", r"buffer", r"loading", r"not opening", r"error",
                  r"download", r"\bapp\b", r"video", r"submit", r"update"],
    "academic_doubt": [r"doubt", r"explain", r"samjha", r"concept", r"formula", r"\bwhy\b",
                       r"how does", r"ai guru"],
}
AT_RISK = [r"!!!", r"worst", r"fraud", r"cheat", r"consumer court", r"legal", r"social media",
           r"twitter", r"instagram", r"third time", r"\b\d+ (baar|times)\b", r"frustrat",
           r"pareshan", r"depress", r"give up", r"hopeless", r"\bro(ta|ti|na)\b"]
NEEDS_HUMAN = [r"refund", r"cancel", r"twice", r"double", r"2 baar", r"block", r"extend",
               r"extension", r"change (my |the |it)?batch", r"transfer", r"replace", r"damaged",
               r"correct", r"still not", r"days ago", r"din ho gaya", r"scam", r"fraud"]


# Common Roman-script Hindi words: two or more means the ticket is Hinglish.
HINGLISH_WORDS = [r"\bhai\b", r"\bnahi\b", r"\bkya\b", r"\bmera\b", r"\bmere\b", r"\bkar\b",
                  r"\braha\b", r"\bgaya\b", r"\bgaye\b", r"\bho\b", r"\bse\b", r"\bke\b", r"\bka\b",
                  r"\bki\b", r"\bme\b", r"\bpe\b", r"\baur\b", r"\bkaise\b", r"\bbhi\b"]


def _matches(patterns: List[str], text: str) -> List[str]:
    """Returns the words in the ticket that matched, e.g. ['3 baar', 'pareshan']."""
    found = (re.search(p, text, flags=re.IGNORECASE) for p in patterns)
    return [m.group(0).strip() for m in found if m]


def _quote(words: List[str]) -> str:
    return "said " + ", ".join(f'"{w}"' for w in dict.fromkeys(words))


def classify(text: str) -> Classification:
    issues = [Issue(category=category, confidence=min(1.0, 0.5 + 0.2 * len(hits)))
              for category, patterns in KEYWORDS.items()
              if (hits := _matches(patterns, text))]
    if not issues:
        issues = [Issue(category="other", confidence=0.5)]
    risk_hits = _matches(AT_RISK, text)
    human_hits = _matches(NEEDS_HUMAN, text)
    if re.search(r"[ऀ-ॿ]", text):
        language = "hi"
    elif len(_matches(HINGLISH_WORDS, text)) >= 2:
        language = "hinglish"
    else:
        language = "en"
    return Classification(
        issues=issues,
        needs_human_action=bool(human_hits),
        needs_human_reason=_quote(human_hits) if human_hits else "",
        at_risk=bool(risk_hits),
        at_risk_reason=_quote(risk_hits) if risk_hits else "",
        language=language,
        summary="(keyword baseline: no summary)",
    )
