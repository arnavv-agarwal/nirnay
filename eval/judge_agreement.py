"""How far the automatic reply judge agrees with a person. Plain code, no API calls.

    python -m eval.judge_agreement

Compares Arnav's hand grades of 20 held-out replies (results/reply_quality/human_grades.json)
with the judge's verdicts on the same replies (results/reply_quality/claude-opus-5-5_test.json).
Lines saying a support agent will follow up are left out of both, as the grading form said.
"""
import json
import re
from pathlib import Path

RESULTS = Path(__file__).parent / "results" / "reply_quality"
FOLLOW_UP = re.compile(r"follow.?up|agent.*\b(will|personally)\b|\bwill\b.*(contact|reach out|get back)", re.I)
LEVEL = {"no": 0, "partly": 1, "yes": 2}


def judge_facts(row: dict) -> str:
    """The judge's claims folded into one verdict, like the person's: any "no" wins, then "partly"."""
    verdicts = [c["supported"] for c in row["claims"] if not FOLLOW_UP.search(c["claim"])]
    return "no" if "no" in verdicts else "partly" if "partly" in verdicts else "yes"


def main() -> None:
    person = json.loads((RESULTS / "human_grades.json").read_text(encoding="utf-8"))["grades"]
    judge = {r["id"]: r for r in json.loads((RESULTS / "claude-opus-5-5_test.json").read_text(encoding="utf-8"))["rows"]}
    agree = {"facts": 0, "answers": 0, "language": 0}
    stricter = lenient = 0
    for ticket, p in person.items():
        j = {"facts": judge_facts(judge[ticket]), "answers": judge[ticket]["answers_question"],
             "language": "yes" if judge[ticket]["same_language"] else "no"}
        for k in agree:
            agree[k] += j[k] == p[k]
        stricter += any(LEVEL[j[k]] < LEVEL[p[k]] for k in ("facts", "answers"))
        lenient += any(LEVEL[j[k]] > LEVEL[p[k]] for k in ("facts", "answers"))
        if j["facts"] != p["facts"] or j["answers"] != p["answers"]:
            print(f"{ticket}: person facts={p['facts']} answers={p['answers']} | judge facts={j['facts']} answers={j['answers']}")
    n = len(person)
    sends = {s: sum(p["send"] == s for p in person.values()) for s in ("as is", "with edits", "no")}
    print(f"\n{n} replies. Agreement: facts {agree['facts']}/{n}, answers {agree['answers']}/{n}, "
          f"language {agree['language']}/{n}. Judge stricter on {stricter}, more lenient on {lenient}. "
          f"The person would send: {sends}")


if __name__ == "__main__":
    main()
