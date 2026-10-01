"""Runs one ticket through every step and records what happened at each."""

from typing import List, Optional

from pydantic import BaseModel

from triage import baseline, config, details, kb, preprocess, rules, sources
from triage.classify import classify
from triage.draft import draft_reply
from triage.llm import LLMError
from triage.schemas import Classification, Decision, Detail, Usage


class TriageResult(BaseModel):
    ticket: str
    cleaned: str
    classification: Classification
    sections: List[str]          # knowledge-base section IDs given to the drafter
    reply: str
    citation_issues: List[str]
    decision: Decision
    usage: Usage
    model: str
    error: Optional[str] = None  # set when the model failed and we fell back
    details: List[Detail] = []   # order IDs, transaction refs, amounts... found in the message
    acknowledgement: str = ""    # sent at once when a person will handle the ticket
    footer: str = ""             # added to automatic replies: how to reach a person
    student_reply: str = ""      # the automatic reply exactly as the student gets it (sources.py)


def finalize(result: TriageResult, threshold: float = config.CONFIDENCE_THRESHOLD,
             prior_contacts: int = 0) -> TriageResult:
    """Applies the escalation rule and writes the student-facing messages.

    Used by run() and again by the inbox when history or the threshold changes.
    The acknowledgement and footer are fixed templates in the student's language.
    """
    if not result.error:  # a failed AI call always stays with a person
        result.decision = rules.decide(result.classification, result.citation_issues, threshold, prior_contacts)
    language = result.classification.language
    if result.decision.escalate:
        tone = "urgent" if result.decision.priority == "urgent" else "normal"
        result.acknowledgement, result.footer = config.ACKNOWLEDGEMENT[language][tone], ""
    else:
        result.acknowledgement = ""
        result.footer = config.AUTO_REPLY_FOOTER[language] if result.reply else ""
    # Suggestions for the agent, best match first. The AI's English summary is added to the
    # message, so Hinglish and Hindi tickets still match English article titles ("charged
    # twice"). Display order only: the drafter has already used its own list.
    if result.sections and result.model != "baseline" and not result.error:
        articles = kb.load_kb()
        chosen = [articles[i] for i in result.sections if i in articles]
        result.sections = [x.id for x in kb.rank(chosen, f"{result.cleaned}\n{result.classification.summary}")]
    # What the student receives: no promise that a person will follow up (no person will see
    # it), numbered sources instead of [IDs], then the footer.
    sent = rules.without_follow_up_promises(result.reply)
    result.student_reply = "\n\n".join(part for part in (sources.for_student(sent, language), result.footer) if part) \
        if result.reply and not result.decision.escalate else ""
    return result


def main_topic_first(c) -> list:
    """Topics in the classifier's order (main issue first), not alphabetical."""
    return list(dict.fromkeys(issue.category for issue in c.issues))


def run(ticket: str, model: str = config.DEFAULT_MODEL,
        threshold: float = config.CONFIDENCE_THRESHOLD, prior_contacts: int = 0) -> TriageResult:
    cleaned = preprocess.clean(ticket)
    found = details.extract(ticket)  # from the original text: IDs are never masked
    usage = Usage()

    # Keyword baseline: no model involved. Useful for comparison, and costs nothing.
    if model == "baseline":
        c = baseline.classify(cleaned)
        sections = kb.sections_for(main_topic_first(c), cleaned)
        return finalize(TriageResult(ticket=ticket, cleaned=cleaned, classification=c,
                                     sections=[s.id for s in sections], reply="", citation_issues=[],
                                     decision=rules.decide(c, [], threshold), usage=usage, model=model,
                                     details=found), threshold, prior_contacts)

    try:
        c, step_usage = classify(cleaned, model)
        usage += step_usage
        sections = kb.sections_for(main_topic_first(c), cleaned)
        draft, step_usage = draft_reply(cleaned, c, sections, model)
        usage += step_usage
    except LLMError as e:
        # Fail safe: classify with keywords and send the ticket to a person.
        c = baseline.classify(cleaned)
        decision = rules.decide(c, [], threshold)
        decision.escalate = True
        decision.priority = "urgent" if c.at_risk else "normal"
        decision.reasons.append(f"AI unavailable, sent to a person: {e}")
        decision.codes.append("ai_failed")
        return finalize(TriageResult(ticket=ticket, cleaned=cleaned, classification=c,
                                     sections=[], reply="", citation_issues=[], decision=decision,
                                     usage=usage, model=model, error=str(e), details=found),
                        threshold, prior_contacts)

    issues = rules.citation_problems(draft.reply, {s.id for s in sections})
    return finalize(TriageResult(ticket=ticket, cleaned=cleaned, classification=c,
                                 sections=[s.id for s in sections], reply=draft.reply,
                                 citation_issues=issues, decision=rules.decide(c, issues, threshold),
                                 usage=usage, model=model, details=found), threshold, prior_contacts)
