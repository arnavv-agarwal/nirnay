"""Turns the agent's citations into sources a student can read. Plain code.

Inside Nirnay a reply cites articles by ID ("... within 7 days [RF-4]."), which the citation
check and the agent need. On WhatsApp "[RF-4]" means nothing, so the student gets numbered
references and a short source list instead, but only for articles with a PW page to open:

    ... not refundable [1].

    Sources:
    1. Refund policy for online batches: https://www.pw.live/terms-and-conditions

A title the student can't tap tells them nothing, so citations of articles without a PW page
(assumed procedures) are dropped from the student's copy. The agent still sees every citation.
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
        if not link_for(sections.get(sid)):  # invented ID, or no PW page to open: nothing to show
            return ""
        if sid not in order:
            order.append(sid)
        return f" [{order.index(sid) + 1}]"

    text = re.sub(r"[ \t]*" + CITATION.pattern, number, reply).strip()
    if not order:
        return text
    lines = [f"{i}. {sections[sid].title}: {link_for(sections[sid])}" for i, sid in enumerate(order, 1)]
    return f"{text}\n\n{HEADING.get(language, 'Sources')}:\n" + "\n".join(lines)


def link_for(section) -> str:
    """PW's page for an article that is official policy; empty for anything else."""
    if section is None or not section.source.startswith("official"):
        return ""
    link = URL.search(section.source)
    return link.group(0) if link else ""
