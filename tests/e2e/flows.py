"""End-to-end flows in a real browser, against the running app.

    python tests/e2e/flows.py      # with the API (port 8000) and web app (port 3000) running

The flows send replies and create tickets, each run under its own student name, so they can
run again on a used inbox (for a fresh one, delete data/nirnay.db and restart the API). The
first flow triages a new ticket, so with an API key it makes one real AI call (about 3 cents).
"""
import os
import sys
import time

from playwright.sync_api import expect, sync_playwright

BASE = os.environ.get("NIRNAY_WEB", "http://localhost:3000")
NAME = f"Test Student {time.strftime('%H%M%S')}"   # unique, so the flows can run again on a used inbox
CHROME = os.environ.get("CHROME_PATH")  # optional; by default Playwright's own Chromium


def launch(p):
    return p.chromium.launch(executable_path=CHROME) if CHROME else p.chromium.launch()
results = []


def check(name, fn):
    try:
        fn()
        results.append(("PASS", name))
    except Exception as e:  # noqa: BLE001
        lines = [l for l in str(e).splitlines() if l.strip()]
        where = next((l.strip() for l in lines if "waiting for" in l), "")
        results.append(("FAIL", f"{name}: {lines[0][:120]} | {where[:160]}"))


with sync_playwright() as p:
    browser = launch(p)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(BASE, wait_until="networkidle")

    def new_ticket():
        page.get_by_role("button", name="New ticket").click()
        page.get_by_label("Student name").fill(NAME)
        page.get_by_label("Message").fill("mera account block ho gaya hai, 3 baar mail kiya koi reply nahi. bahut pareshan hu")
        page.get_by_role("button", name="Triage ticket").click()
        expect(page.get_by_role("heading", name=NAME)).to_be_visible(timeout=40000)  # the AI takes ~10s
        expect(page.locator("aside").get_by_text("Urgent: why this needs you")).to_be_visible()
    check("New ticket is triaged, lands urgent, opens with reasons", new_ticket)

    def correct():
        page.get_by_role("button", name="Topic wrong? Correct it").click()
        page.get_by_label("Payment").check()
        page.get_by_role("button", name="Save correction").click()
        expect(page.get_by_text("Corrected by an agent to")).to_be_visible(timeout=10000)
    check("Agent corrects the topic; it is saved", correct)

    def send():
        page.get_by_label("Reply", exact=True).fill("Sorry for the trouble. An agent is unblocking your account now [BA-3].")
        expect(page.get_by_text("Logging in on more than one device").first).to_be_visible()
        reply = page.get_by_label("Reply", exact=True).input_value()
        page.get_by_role("button", name="Send reply").click()
        expect(page.get_by_role("status").filter(has_text=f"Sending to {NAME}")).to_be_visible()
        assert page.locator("#conv-title").inner_text() != NAME, "did not move to the next ticket"
        page.get_by_role("button", name="Undo").click()                       # undo inside the window
        expect(page.locator("#conv-title")).to_have_text(NAME)
        assert page.get_by_label("Reply", exact=True).input_value() == reply, "reply lost on undo"
        page.get_by_role("button", name="Send reply").click()                 # send for real
        expect(page.get_by_role("status").filter(has_text=f"Reply sent to {NAME}.")).to_be_visible(timeout=10000)
        page.get_by_placeholder("Search name, ticket or message").fill(NAME)
        page.locator("ol li button", has_text=NAME).click()
        expect(page.get_by_text("Sent by an agent")).to_be_visible()
        page.get_by_placeholder("Search name, ticket or message").fill("")
    check("Send: next ticket opens; Undo restores the reply; it really sends after 5s", send)

    def search():
        page.get_by_placeholder("Search name, ticket or message").fill(NAME)
        expect(page.get_by_text("Searching all")).to_be_visible()
        expect(page.locator("ol li button", has_text=NAME)).to_have_count(1)
        page.get_by_placeholder("Search name, ticket or message").fill("")
    check("Search looks across every queue (finds the resolved ticket)", search)

    def filters():
        page.get_by_role("tab", name="Needs you").click()
        rows = page.locator("ol li button[class*=row]")
        before = rows.count()
        page.locator("button[aria-controls=filter-panel]").click()
        expected = int(page.locator("#filter-panel button", has_text="Payment").inner_text().split()[-1])
        page.locator("#filter-panel button", has_text="Payment").click()
        page.keyboard.press("Escape")
        assert rows.count() == expected < before, (rows.count(), expected, before)
        page.get_by_label("Sort tickets").select_option("topic")
        expect(page.locator("ol h2").first).to_be_visible()
        page.get_by_label("Remove filter: Payment").click()
        page.get_by_label("Sort tickets").select_option("urgency")
        assert rows.count() == before
    check("Filter narrows the queue to the counted tickets; topic sort groups; chip removes it", filters)

    def keyboard():
        page.get_by_role("tab", name="Needs you").click()
        before = page.locator("#conv-title").inner_text()
        page.locator("body").click(position={"x": 800, "y": 400})
        page.keyboard.press("j")
        page.wait_for_timeout(200)
        assert page.locator("#conv-title").inner_text() != before, "j did not move"
    check("j moves to the next ticket", keyboard)

    def quality():
        page.get_by_role("link", name="Quality").click()
        expect(page.get_by_role("heading", name="Confidence threshold")).to_be_visible()
        expect(page.locator("ul[class*=corrections] li").first).to_contain_text("Payment")  # newest correction first
        slider = page.get_by_role("slider")
        badge_before = page.locator("aside em").first.inner_text()
        slider.fill("0.9")
        page.get_by_role("button", name="Use 0.90 in the live inbox").click()
        expect(page.get_by_text("Live inbox now uses 0.90 for new tickets")).to_be_visible(timeout=10000)
        page.wait_for_timeout(300)
        assert page.locator("aside em").first.inner_text() == badge_before, "a threshold change moved existing tickets"
        slider.fill("0.8")
        page.get_by_role("button", name="Use 0.80 in the live inbox").click()
        expect(page.get_by_text("Live inbox now uses 0.80 for new tickets")).to_be_visible(timeout=10000)
    check("Quality: correction listed; new threshold applies to new tickets only, and restores", quality)

    def reopen():
        page.get_by_role("link", name="Inbox").click()
        page.get_by_role("tab", name="Auto-resolved").click()
        page.locator("ol li button[class*=row]").first.click()
        name = page.locator("#conv-title").inner_text()
        page.get_by_role("button", name="Should a person handle this? Reopen it").first.click()
        expect(page.get_by_role("status").filter(has_text="is back in Needs you")).to_be_visible()
        expect(page.locator("aside").get_by_text("An agent reopened Nirnay's automatic reply")).to_be_visible()
        expect(page.get_by_text("reopened by an agent")).to_be_visible()          # the sent reply stays visible
        assert page.get_by_role("button", name="Use Nirnay's draft").count() == 0  # already sent, not offered again
        page.get_by_role("link", name="Quality").click()
        expect(page.get_by_text("Should have come to a person").first).to_be_visible()
    check("Reopen an automatic reply: back to Needs you, reply kept, recorded on Quality", reopen)

    def mistakes():
        page.get_by_label("Only mistakes").check()
        rows = page.locator("tbody tr").count()
        assert 0 < rows < 40, f"{rows} rows"
    check("'Only mistakes' filters the results table", mistakes)

    def knowledge():
        page.get_by_role("link", name="Knowledge base").click()
        page.get_by_placeholder("Search refund, OTP, EMI, RF-2…").fill("OTP")
        expect(page.locator("article#TS-1")).to_be_visible()
        assert page.locator("article").count() < 27
    check("Knowledge base search filters articles", knowledge)

    browser.close()

for status, name in results:
    print(status, name)
print("page errors:", errors or "none")
sys.exit(1 if errors or any(status == "FAIL" for status, _ in results) else 0)
