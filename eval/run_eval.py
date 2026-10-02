"""Runs the labelled tickets through the pipeline and reports how it did.

Usage:
    python -m eval.run_eval --model baseline --split dev
    python -m eval.run_eval --model claude-opus-5-5 --split test
    python -m eval.run_eval --model claude-opus-5-5 --split blind    # written separately, without seeing the prompts

Every prediction is saved to eval/results/, and the scores can be recomputed
from those files without calling the model again.
"""

import argparse
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from dotenv import load_dotenv

from eval import metrics
from triage import config, pipeline

DATA = config.ROOT / "data" / "tickets.jsonl"
BLIND = config.ROOT / "data" / "blind_tickets.jsonl"   # kept apart: never used for tuning
RESULTS = config.ROOT / "eval" / "results"


def load_tickets(split: str) -> list:
    source = BLIND if split == "blind" else DATA
    tickets = [json.loads(line) for line in source.read_text(encoding="utf-8").splitlines() if line]
    return [t for t in tickets if split == "all" or t["split"] == split]


def run_one(ticket: dict, model: str) -> dict:
    result = pipeline.run(ticket["text"], model=model)
    c = result.classification
    return {
        **ticket,
        "pred_categories": c.categories,
        "pred_escalate": result.decision.escalate,
        "pred_at_risk": c.at_risk,
        "pred_needs_human": c.needs_human_action,
        "min_confidence": c.min_confidence,
        "reasons": result.decision.reasons,
        "codes": result.decision.codes,
        "reply": result.reply,
        "citation_issues": result.citation_issues,
        "classification": c.model_dump(),
        "error": result.error,
        "cost_usd": result.usage.cost_usd,
        "latency_s": result.usage.latency_s,
    }


def print_report(name: str, s: dict, sweep: list) -> None:
    print(f"\n=== {name} — {s['tickets']} tickets ===")
    print(f"Category exact match:   {s['category_exact_match']:.0%}")
    print(f"Escalation accuracy:    {s['escalation_accuracy']:.0%}   "
          f"(precision {s['escalation']['precision']:.0%}, recall {s['escalation']['recall']:.0%})")
    print(f"Auto-reply rate:        {s['auto_reply_rate']:.0%}")
    print(f"Missed escalations:     {s['missed_escalations'] or 'none'}")
    print(f"Unneeded escalations:   {s['unneeded_escalations'] or 'none'}")
    print(f"At-risk detection:      precision {s['at_risk']['precision']:.0%}, recall {s['at_risk']['recall']:.0%}")
    print(f"Needs-human detection:  precision {s['needs_human']['precision']:.0%}, recall {s['needs_human']['recall']:.0%}")
    print(f"Citation check passed:  {s['citation_pass_rate']:.0%}    Model errors: {s['model_errors']}")
    print(f"Cost per ticket:        ${s['cost_usd_per_ticket']:.4f}   (total ${s['cost_usd_total']:.3f})")
    print(f"Latency:                mean {s['latency_s_mean']:.1f}s, p95 {s['latency_s_p95']:.1f}s")
    print("\nPer category              precision  recall  support")
    for category, m in s["categories"].items():
        print(f"  {category:<22} {m['precision']:>8.0%} {m['recall']:>7.0%} {m['support']:>8}")
    print("\nThreshold sweep           precision  recall  auto-reply")
    for p in sweep:
        print(f"  {p['threshold']:<22.2f} {p['precision']:>8.0%} {p['recall']:>7.0%} {p['auto_reply_rate']:>10.0%}")


def main() -> None:
    load_dotenv()
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default=config.DEFAULT_MODEL)
    parser.add_argument("--split", choices=["dev", "test", "blind", "all"], default="dev")
    parser.add_argument("--workers", type=int, default=4)
    args = parser.parse_args()

    tickets = load_tickets(args.split)
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        rows = list(pool.map(lambda t: run_one(t, args.model), tickets))

    name = f"{args.model}_{args.split}"
    summary = metrics.summarise(rows)
    sweep = metrics.threshold_sweep(rows, [0.5, 0.6, 0.7, 0.8, 0.9, 0.95])

    RESULTS.mkdir(parents=True, exist_ok=True)
    (RESULTS / f"{name}.json").write_text(json.dumps(
        {"model": args.model, "split": args.split, "summary": summary, "sweep": sweep, "rows": rows},
        indent=2, ensure_ascii=False), encoding="utf-8")
    print_report(name, summary, sweep)
    print(f"\nSaved to eval/results/{name}.json")


if __name__ == "__main__":
    main()
