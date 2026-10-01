"""Loads the knowledge base and picks the articles relevant to a ticket.

No embeddings or vector database: with 81 articles, the classifier's topics already
tell us which documents matter (plus any PW programme the student names), and the
words a ticket shares with each article put the best match first. Exact, free and
easy to explain. At PW's real scale, embedding search inside each topic would
replace the word overlap.
"""

import re
from dataclasses import dataclass
from functools import lru_cache
from typing import Dict, List

from triage import config

HEADING = re.compile(r"^## (?P<id>[A-Z]{2}-\d+) · (?P<title>.+)$")


@dataclass(frozen=True)
class Section:
    id: str       # e.g. "RF-2", used in citations
    title: str
    doc: str      # file name without .md
    source: str   # "official — <url>" or "assumed for this prototype"
    text: str


def parse_doc(doc: str, markdown: str) -> List[Section]:
    sections, current, body = [], None, []

    def flush():
        if current:
            source_line = next((l for l in body if l.startswith("Source:")), "Source: unknown")
            text = "\n".join(l for l in body if not l.startswith("Source:")).strip()
            sections.append(Section(current["id"], current["title"], doc,
                                    source_line.removeprefix("Source:").strip(), text))

    for line in markdown.splitlines():
        match = HEADING.match(line)
        if match:
            flush()
            current, body = match.groupdict(), []
        elif current:
            body.append(line)
    flush()
    return sections


@lru_cache(maxsize=1)
def load_kb() -> Dict[str, Section]:
    sections = {}
    for path in sorted(config.KB_DIR.glob("*.md")):
        for section in parse_doc(path.stem, path.read_text(encoding="utf-8")):
            sections[section.id] = section
    return sections


def docs_for(categories: List[str], text: str = "") -> List[str]:
    """Core documents for the ticket's topics, then any PW programme the ticket mentions,
    then contact/escalation. The order is the order the drafter and the agent see them."""
    docs: List[str] = []
    for category in categories:
        docs += [d for d in config.CATEGORY_DOCS.get(category, []) if d not in docs]
    for doc, pattern in config.PROGRAMME_DOCS.items():
        if doc not in docs and ("other" in categories or re.search(pattern, text, flags=re.IGNORECASE)):
            docs.append(doc)
    return docs + [d for d in config.ALWAYS_INCLUDED_DOCS if d not in docs]


def sections_for(categories: List[str], text: str = "") -> List[Section]:
    """The articles for these topics, most relevant to the ticket first."""
    order = {doc: i for i, doc in enumerate(docs_for(categories, text))}
    chosen = sorted((s for s in load_kb().values() if s.doc in order), key=lambda s: order[s.doc])
    return with_references(rank(chosen, text))


REFERENCE = re.compile(r"\(([A-Z]{2}-\d+)\)")


def with_references(sections: List[Section]) -> List[Section]:
    """Adds the articles the chosen ones point to, like "(RF-2)", after them: a batch-change rule
    referred to from a batch-access article should be citable too. One hop only."""
    kb, have = load_kb(), {s.id for s in sections}
    extra = []
    for s in sections:
        for ref in REFERENCE.findall(s.text):
            if ref in kb and ref not in have:
                have.add(ref)
                extra.append(kb[ref])
    return sections + extra


# Words too common to say anything about which article fits (English and Hinglish).
STOPWORDS = set("""the and for not but you your yours are was were have has had this that with from they them what
when where which who why how can could would should will just only also been being into about after before
there here than then very more most some any all our out get got please sir mam hai hain nahi nhi kya mera meri
mere mujhe kar karo kiya raha rahi rahe tha thi the bhi aur kuch koi abhi phir liye diya gaya hua hui hota ho""".split())


def words(text: str) -> set:
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    return {t.rstrip("s") if len(t) > 3 else t for t in tokens if len(t) >= 3 and t not in STOPWORDS}


def rank(sections: List[Section], text: str) -> List[Section]:
    """Orders articles by how many of the ticket's words they share, title words counting triple.
    Ties keep the topic order, so with no overlap nothing moves. Plain word matching, no embeddings:
    exact, free, and enough for 81 articles."""
    ticket = words(text)
    if not ticket:
        return sections
    def score(s: Section) -> int:
        return 3 * len(ticket & words(s.title)) + len(ticket & words(s.text))
    return sorted(sections, key=score, reverse=True)  # sorted() is stable


def format_for_prompt(sections: List[Section]) -> str:
    return "\n\n".join(f"[{s.id}] {s.title}\n{s.text}" for s in sections)
