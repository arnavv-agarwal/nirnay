"""Every tunable setting in one place, so live changes are one-line edits."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KB_DIR = ROOT / "kb"

CATEGORIES = ["refund", "batch_access", "payment", "technical", "academic_doubt", "other"]

# Which knowledge-base documents a category may cite. Each topic always gets its core
# documents; a PW programme's documents are added only when the ticket mentions that
# programme (PROGRAMME_DOCS), so an online-batch refund isn't drafted from OnlyIAS policy.
# "other" gets every programme document: the rule sends it to a person, with a draft ready.
CATEGORY_DOCS = {
    "refund": ["refunds-and-cancellations"],
    "batch_access": ["batch-access", "joining-a-batch"],
    "payment": ["payments", "refunds-and-cancellations"],
    "technical": ["technical-support"],
    "academic_doubt": ["doubts-and-academics"],
    "other": ["joining-a-batch"],   # questions before buying (timetable, demos, joining late) are "other"
}
PROGRAMME_DOCS = {  # document: words in the ticket that mean it's about that programme
    "offline-centres": r"vidyapeeth|pathshala|centre|center|offline|seat book|security deposit|id card|विद्यापीठ",
    "pw-store-orders": r"\bbooks?\b|\border\b|pwb-|deliver|courier|dispatch|module set|kitab|किताब",
    "scholarships": r"nsat|scholarship|prodigy|एनसैट|स्कॉलरशिप",
    "pw-skills": r"pw ?skills|certificate|assignment|placement|job assistance|data science|full stack|web dev|\bdsa\b|digital marketing|banking & finance",
    "pw-onlyias": r"only ?ias|\bupsc\b",
    "account-and-privacy": r"account|delete|mobile number|phone number|privacy|promotional|marketing|photo|profile|grievance|अकाउंट",
}
ALWAYS_INCLUDED_DOCS = ["contact-and-escalation"]

# Escalate when the classifier is less sure than this about any issue in the ticket.
# Tuned on the dev split; see eval/threshold_sweep output.
CONFIDENCE_THRESHOLD = 0.8

# Categories that always go to a person because the knowledge base can't resolve them.
ALWAYS_ESCALATE_CATEGORIES = {"other"}

# The help article on when a person takes over. An automatic reply never cites it, nor says
# a person will follow up: no person sees that ticket (rules.without_follow_up_promises).
TAKEOVER_ARTICLE = "CT-3"

# A student writing again within this many days counts as a repeat contact:
# the 2nd message goes to a person, the 3rd is urgent.
REPEAT_WINDOW_DAYS = 7

# Sent the moment an escalated ticket arrives, so the student knows a person has it
# and doesn't write again. Fixed text in the student's language: no AI involved.
ACKNOWLEDGEMENT = {
    "en": {
        "normal": "Thanks for writing to PW Support. A member of our team is looking into this and will reply here. You don't need to send it again.",
        "urgent": "We're sorry you're going through this. A member of PW Support is looking at your message now and will reply to you personally, as a priority.",
    },
    "hinglish": {
        "normal": "PW Support ko message karne ke liye thank you. Hamari team ka ek member ise dekh raha hai aur yahin reply karega. Aapko dobara message bhejne ki zarurat nahi hai.",
        "urgent": "Humein afsos hai ki aapko ye pareshani ho rahi hai. PW Support ka ek member abhi aapka message dekh raha hai aur priority par aapko khud reply karega.",
    },
    "hi": {
        "normal": "PW सपोर्ट को लिखने के लिए धन्यवाद। हमारी टीम का एक सदस्य इसे देख रहा है और यहीं जवाब देगा। आपको दोबारा संदेश भेजने की ज़रूरत नहीं है।",
        "urgent": "हमें खेद है कि आपको यह परेशानी हो रही है। PW सपोर्ट का एक सदस्य अभी आपका संदेश देख रहा है और प्राथमिकता से आपको खुद जवाब देगा।",
    },
}

# Added to every automatic reply, so a student is never stuck with the bot.
AUTO_REPLY_FOOTER = {
    "en": "Still stuck? Just reply to this message and a person from PW Support will take over.",
    "hinglish": "Abhi bhi problem hai? Bas is message ka reply kariye, PW Support ka ek member aapki help karega.",
    "hi": "अब भी समस्या है? बस इस संदेश का जवाब दें, PW सपोर्ट का एक सदस्य आपकी मदद करेगा।",
}

DEFAULT_MODEL = "claude-opus-5-5"

# USD per million tokens (input, output), from Anthropic's published API prices.
PRICES = {
    "claude-opus-5-5": (4.00, 20.00),
    "claude-sonnet-5-5": (2.00, 10.00),
    "claude-haiku-4-5": (1.00, 5.00),
}

# Haiku 4.5 rejects the `effort` setting; the newer models accept it.
MODELS_WITH_EFFORT = {"claude-opus-5-5", "claude-sonnet-5-5"}
EFFORT = "low"  # classification and short replies don't need deep reasoning
