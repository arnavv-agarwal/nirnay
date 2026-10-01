"""Cleans ticket text before it reaches a model. Plain code: no model needed."""

import re

PHONE = re.compile(r"(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{9}(?!\d)")
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")
MAX_CHARS = 4000  # longer tickets are cut; real tickets are far shorter


def clean(text: str) -> str:
    """Masks phone numbers and emails, and normalises whitespace.

    Order IDs and transaction IDs are kept: support needs them.
    """
    text = PHONE.sub("[PHONE]", text)
    text = EMAIL.sub("[EMAIL]", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()[:MAX_CHARS]
