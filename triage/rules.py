"""The escalation rule and the citation check. Plain code on purpose:

these decisions must be predictable, auditable and changeable without
re-prompting a model.
"""

import re
from typing import List, Set

from triage import config
from triage.schemas import Classification, Decision

CITATION = re.compile(r"\[([A-Z]{2}-\d+)\]")


def cited_ids(reply: str) -> List[str]:
    return CITATION.findall(reply)


def citation_problems(reply: str, allowed_ids: Set[str]) -> List[str]:
    """Returns what's wrong with the draft's citations (empty list = OK)."""
    ids = cited_ids(reply)
    if not reply.strip():
        return ["empty reply"]
    if not ids:
        return ["reply cites no knowledge-base section"]
    unknown = sorted(set(ids) - allowed_ids)
    if unknown:
        return [f"reply cites sections it wasn't given: {', '.join(unknown)}"]
    return []


def decide(c: Classification, citation_issues: List[str],
           threshold: float = config.CONFIDENCE_THRESHOLD, prior_contacts: int = 0) -> Decision:
    """prior_contacts = how many other tickets this student sent in the repeat window.
    It needs inbox history, so the per-ticket evaluation always passes 0."""
    reasons, codes = [], []
    if c.at_risk:
        reasons.append(f"Student at risk: {c.at_risk_reason}")
        codes.append("at_risk")
    if c.needs_human_action:
        reasons.append(f"Needs account/payment action: {c.needs_human_reason}")
        codes.append("needs_action")
    for category in sorted(set(c.categories) & config.ALWAYS_ESCALATE_CATEGORIES):
        reasons.append(f"Category '{category}' is outside the knowledge base")
        codes.append("out_of_scope")
    if c.min_confidence < threshold:
        reasons.append(f"Low confidence ({c.min_confidence:.2f} < {threshold:.2f})")
        codes.append("low_confidence")
    if citation_issues:
        reasons.extend(f"Citation check failed: {issue}" for issue in citation_issues)
        codes.append("citation_failed")
    if prior_contacts:
        reasons.append(f"Repeat contact: message {prior_contacts + 1} from this student in {config.REPEAT_WINDOW_DAYS} days")
        codes.append("repeat_contact")

    if c.at_risk or prior_contacts >= 2:
        priority = "urgent"
    elif reasons:
        priority = "normal"
    else:
        priority = "none"
    return Decision(escalate=bool(reasons), priority=priority, reasons=reasons, codes=codes)
