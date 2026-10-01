"""Pulls the details an agent needs out of the message: order IDs, transaction
references, amounts, batch and centre names. Plain regular expressions: exact,
free, and never wrong about what the student actually typed.
"""

import re
from typing import List

from triage.schemas import Detail

PATTERNS = [
    ("Order ID", r"\bPWB?-?\d{5,}\b"),
    ("Transaction ref", r"(?<![\d])\d{12}(?![\d])"),       # UPI / UTR numbers are 12 digits
    ("Amount", r"(?:Rs\.?|₹|INR)\s?\d[\d,]*(?:\.\d+)?|\b\d[\d,]*\s?(?:rs|rupees)\b"),
    ("Batch", r"\b(?:Arjuna|Yakeen|Lakshya|Udaan|Prayas|Neev|Umang|Power Batch)(?:\s(?:JEE|NEET))?(?:\s\d\.0)?(?:\s20\d\d)?\b"),
    ("Centre", r"\b(?:Kota|Delhi|Patna|Noida|Lucknow|Varanasi|Dhanbad|Indore|Bhopal|Jaipur|Pune)\b(?=[^.\n]{0,25}(?:Vidyapeeth|Pathshala|centre|center|OnlyIAS))"),
]


def extract(text: str) -> List[Detail]:
    found, seen = [], set()
    for kind, pattern in PATTERNS:
        for match in re.finditer(pattern, text, flags=re.IGNORECASE):
            value = match.group(0).strip()
            key = (kind, value.lower())
            if key not in seen:
                seen.add(key)
                found.append(Detail(kind=kind, value=value))
    return found
