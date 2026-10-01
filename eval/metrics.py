"""Scoring functions. Each takes the saved rows, so scores can be recomputed without API calls."""

from typing import Dict, List

from triage import config, rules
from triage.schemas import Classification


def precision_recall(predicted: List[bool], actual: List[bool]) -> Dict[str, float]:
    tp = sum(p and a for p, a in zip(predicted, actual))
    fp = sum(p and not a for p, a in zip(predicted, actual))
    fn = sum(a and not p for p, a in zip(predicted, actual))
    precision = tp / (tp + fp) if tp + fp else 1.0
    recall = tp / (tp + fn) if tp + fn else 1.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return {"precision": precision, "recall": recall, "f1": f1, "tp": tp, "fp": fp, "fn": fn}


def category_scores(rows: List[dict]) -> Dict[str, dict]:
    scores = {}
    for category in config.CATEGORIES:
        predicted = [category in r["pred_categories"] for r in rows]
        actual = [category in r["categories"] for r in rows]
        scores[category] = {**precision_recall(predicted, actual), "support": sum(actual)}
    return scores


def summarise(rows: List[dict]) -> dict:
    n = len(rows)
    escalation = precision_recall([r["pred_escalate"] for r in rows],
                                  [r["should_escalate"] for r in rows])
    latencies = sorted(r["latency_s"] for r in rows)
    return {
        "tickets": n,
        "category_exact_match": sum(set(r["pred_categories"]) == set(r["categories"])
                                    for r in rows) / n,
        "categories": category_scores(rows),
        "escalation": escalation,
        "escalation_accuracy": sum(r["pred_escalate"] == r["should_escalate"] for r in rows) / n,
        "missed_escalations": [r["id"] for r in rows if r["should_escalate"] and not r["pred_escalate"]],
        "unneeded_escalations": [r["id"] for r in rows if r["pred_escalate"] and not r["should_escalate"]],
        "auto_reply_rate": sum(not r["pred_escalate"] for r in rows) / n,
        "at_risk": precision_recall([r["pred_at_risk"] for r in rows], [r["at_risk"] for r in rows]),
        "needs_human": precision_recall([r["pred_needs_human"] for r in rows],
                                        [r["needs_human_action"] for r in rows]),
        "citation_pass_rate": sum(not r["citation_issues"] for r in rows) / n,
        "model_errors": sum(bool(r["error"]) for r in rows),
        "cost_usd_total": sum(r["cost_usd"] for r in rows),
        "cost_usd_per_ticket": sum(r["cost_usd"] for r in rows) / n,
        "latency_s_mean": sum(latencies) / n,
        "latency_s_p95": latencies[min(n - 1, int(0.95 * n))],
    }


def threshold_sweep(rows: List[dict], thresholds: List[float]) -> List[dict]:
    """Re-applies the escalation rule at each threshold using the saved classifications."""
    points = []
    for t in thresholds:
        predicted = [rules.decide(Classification.model_validate(r["classification"]),
                                  r["citation_issues"], t).escalate for r in rows]
        pr = precision_recall(predicted, [r["should_escalate"] for r in rows])
        points.append({"threshold": t, **pr,
                       "auto_reply_rate": sum(not p for p in predicted) / len(rows)})
    return points
