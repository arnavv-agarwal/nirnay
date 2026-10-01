"""Turns the agent's citations into sources a student can read. Plain code.

Inside Nirnay a reply cites articles by ID ("... within 2 hours [BA-1]."), which the citation
check and the agent need. On WhatsApp "[BA-1]" means nothing, so the student gets numbered
references and a short source list instead, with PW's link when the article is official policy:

    ... within 2 hours [1].

    Sources:
    1. Purchased batch not showing in the app
"""

import re

from triage import kb
from triage.rules import CITATION

HEADING = {"en": "Sources", "hinglish": "Sources", "hi": "स्रोत"}
URL = re.compile(r"https?://[^\s,;)]+")


def for_student(reply: str, language: str = "en") -> str:
    sections = kb.load_kb()
    order: list = []

    def number(match: re.Match) -> str:
        sid = match.group(1)
        if sid not in sections:  # an invented ID fails the citation check; never show it to a student
            return ""
        if sid not in order:
            order.append(sid)
        return f"[{order.index(sid) + 1}]"

    text = CITATION.sub(number, reply).strip()
    if not order:
        return text
    lines = []
    for i, sid in enumerate(order, 1):
        section = sections[sid]
        link = URL.search(section.source) if section.source.startswith("official") else None
        lines.append(f"{i}. {section.title}" + (f": {link.group(0)}" if link else ""))
    return f"{text}\n\n{HEADING.get(language, 'Sources')}:\n" + "\n".join(lines)
