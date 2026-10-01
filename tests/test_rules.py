"""The escalation rule and citation check: the decisions that must never change by accident."""

from triage import config, rules
from triage.schemas import Classification, Issue


def ticket(*categories, confidence=0.95, at_risk=False, needs_action=False):
    return Classification(
        issues=[Issue(category=c, confidence=confidence) for c in categories or ["technical"]],
        needs_human_action=needs_action, needs_human_reason="refund request" if needs_action else "",
        at_risk=at_risk, at_risk_reason="said 'consumer court'" if at_risk else "",
        language="en", summary="")


def test_clear_ticket_is_auto_replied():
    d = rules.decide(ticket("technical"), citation_issues=[])
    assert not d.escalate and d.priority == "none" and d.codes == []


def test_each_rule_escalates_with_its_code():
    cases = {
        "at_risk": ticket(at_risk=True),
        "needs_action": ticket("refund", needs_action=True),
        "out_of_scope": ticket("other"),
        "low_confidence": ticket(confidence=config.CONFIDENCE_THRESHOLD - 0.01),
    }
    for code, c in cases.items():
        d = rules.decide(c, citation_issues=[])
        assert d.escalate and code in d.codes, code
    assert "citation_failed" in rules.decide(ticket(), ["reply cites no knowledge-base section"]).codes


def test_confidence_exactly_at_threshold_is_not_low():
    assert not rules.decide(ticket(confidence=config.CONFIDENCE_THRESHOLD), []).escalate


def test_upset_student_is_urgent():
    assert rules.decide(ticket(at_risk=True), []).priority == "urgent"


def test_repeat_contacts_escalate_and_third_message_is_urgent():
    second = rules.decide(ticket(), [], prior_contacts=1)
    third = rules.decide(ticket(), [], prior_contacts=2)
    assert second.escalate and second.priority == "normal" and "repeat_contact" in second.codes
    assert third.priority == "urgent"


def test_multi_issue_ticket_uses_its_lowest_confidence():
    c = Classification(issues=[Issue(category="payment", confidence=0.95), Issue(category="technical", confidence=0.4)],
                       needs_human_action=False, needs_human_reason="", at_risk=False, at_risk_reason="",
                       language="en", summary="")
    assert "low_confidence" in rules.decide(c, []).codes


def test_citation_check():
    allowed = {"RF-1", "CT-1"}
    assert rules.citation_problems("Refunds are not available [RF-1].", allowed) == []
    assert rules.citation_problems("Refunds are not available.", allowed)            # no citation
    assert rules.citation_problems("You'll get a refund [RF-9].", allowed)           # invented article
    assert rules.citation_problems("   ", allowed)                                    # empty
