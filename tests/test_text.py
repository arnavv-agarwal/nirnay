"""Plain-code text steps: masking personal data, pulling out details, choosing help articles."""

from triage import details, kb, preprocess
from triage.sources import for_student


def test_phone_and_email_are_masked_but_order_ids_kept():
    cleaned = preprocess.clean("Call me on +91 9876543210 or mail riya.s@gmail.com. Order PWB-4471823.")
    assert "9876543210" not in cleaned and "riya.s@gmail.com" not in cleaned
    assert "[PHONE]" in cleaned and "[EMAIL]" in cleaned and "PWB-4471823" in cleaned


def test_details_are_extracted():
    found = {(d.kind, d.value) for d in details.extract(
        "Paid Rs 5,100 for Yakeen NEET 2.0 via UPI (UTR 318822734411), order PWB-4471823. Kota Vidyapeeth centre.")}
    assert ("Amount", "Rs 5,100") in found
    assert ("Transaction ref", "318822734411") in found
    assert ("Order ID", "PWB-4471823") in found
    assert ("Batch", "Yakeen NEET 2.0") in found
    assert ("Centre", "Kota") in found


def test_a_ten_digit_phone_number_is_not_a_transaction_ref():
    assert not [d for d in details.extract("my number is 9876543210") if d.kind == "Transaction ref"]


def test_online_refund_gets_only_refund_and_contact_articles():
    assert kb.docs_for(["refund"], "I want a refund for my online batch") == ["refunds-and-cancellations", "contact-and-escalation"]


def test_named_programme_adds_its_articles_after_the_core_ones():
    docs = kb.docs_for(["refund"], "Refund of my Kota Vidyapeeth fees please")
    assert docs == ["refunds-and-cancellations", "offline-centres", "contact-and-escalation"]


def test_other_gets_every_programme_so_the_agent_still_has_a_draft():
    docs = kb.docs_for(["other"], "")
    assert {"pw-store-orders", "offline-centres", "scholarships", "pw-skills", "pw-onlyias"} <= set(docs)


def test_every_article_has_a_source_line_and_a_unique_id():
    sections = kb.load_kb()
    assert len(sections) == 81
    assert all(s.source != "unknown" for s in sections.values())


def test_students_get_numbered_sources_not_article_ids():
    text = for_student("Wait 2 hours [BA-1]. Then log out and in again [BA-1]. Refunds are reviewed by an agent [RF-4].")
    assert "[BA-1]" not in text and "[RF-4]" not in text
    assert "hours [1]." in text and "again [1]." in text and "agent [2]." in text
    assert "Sources:\n1. Purchased batch not showing in the app" in text
    assert "2. How refund and batch-change requests are handled" in text


def test_official_sources_carry_their_pw_link_and_invented_ids_are_dropped():
    text = for_student("Online batches are not refundable [RF-1]. See [ZZ-9].", "hi")
    assert "स्रोत:" in text and "https://www.pw.live/terms-and-conditions" in text and "ZZ-9" not in text


def test_suggestions_lead_with_the_article_that_matches_the_ticket():
    assert [s.id for s in kb.sections_for(["batch_access", "technical"], "OTP nahi aa raha login ke liye")][0] == "TS-1"
    assert [s.id for s in kb.sections_for(["other"], "Books not delivered yet, order placed 10 days ago")][0] == "ST-4"


def test_questions_before_joining_lead_with_the_joining_articles():
    assert [s.id for s in kb.sections_for(["other"], "Arjuna batch kab start hoga, timings kya hain, demo lecture?")][0] == "JB-1"
    assert [s.id for s in kb.sections_for(["batch_access"], "Can I join Yakeen now? It already started, will I get old lectures?")][0] == "JB-2"
