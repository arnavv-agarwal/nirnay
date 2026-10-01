"""Sending a reply on a phone, in a real browser, against the running app.

    python tests/e2e/phone.py      # with the API (port 8000) and web app (port 3000) running

On a phone the list and the ticket are separate screens, and the 5-second undo window runs
in the browser. These checks make sure an agent always sees that a reply went, and that
switching apps inside the window doesn't lose it. Uses demo tickets only: no AI calls.
"""
import os
import re
import sys

from playwright.sync_api import expect, sync_playwright

BASE = os.environ.get("NIRNAY_WEB", "http://localhost:3000")
CHROME = os.environ.get("CHROME_PATH")  # optional; by default Playwright's own Chromium

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
    browser = p.chromium.launch(executable_path=CHROME) if CHROME else p.chromium.launch()
    page = browser.new_context(**p.devices["iPhone 13"]).new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(BASE, wait_until="networkidle")
    status = page.get_by_role("status")
    state = {}

    def open_and_draft():
        page.get_by_role("tab", name="Needs you").click()
        page.locator("ol li button[class*=row]").first.click()
        state["name"] = page.locator("#conv-title").inner_text()
        page.get_by_role("button", name="Use Nirnay's draft").click()
        state["reply"] = page.get_by_label("Reply", exact=True).input_value()
        assert state["reply"].strip(), "draft did not fill the reply box"

    def send_shows_list():
        open_and_draft()
        page.get_by_role("button", name="Send reply").click()
        expect(status.filter(has_text=f"Sending to {state['name'].rstrip('.')}")).to_be_visible()
        expect(page.get_by_role("button", name="Undo")).to_be_visible()
        expect(page.locator("#conv-title")).to_be_hidden()                    # the list, not another ticket
    check("Send goes back to the list, showing 'Sending to … Undo'", send_shows_list)

    def undo_returns():
        page.get_by_role("button", name="Undo").click()
        expect(page.locator("#conv-title")).to_have_text(state["name"])
        assert page.get_by_label("Reply", exact=True).input_value() == state["reply"], "reply lost on undo"
    check("Undo goes back to the ticket with the reply in the box", undo_returns)

    def really_sends():
        page.get_by_role("button", name="Send reply").click()
        expect(status.filter(has_text=f"Reply sent to {state['name'].rstrip('.')}.")).to_be_visible(timeout=10000)
        page.get_by_role("tab", name=re.compile(r"^Resolved")).click()
        expect(page.locator("ol li button", has_text=state["name"]).first).to_be_visible()
    check("After 5 seconds 'Reply sent' shows and the ticket is in Resolved", really_sends)

    def hidden_sends_now():
        open_and_draft()
        page.get_by_role("button", name="Send reply").click()
        page.evaluate("""() => {                                              // the agent switches apps
            Object.defineProperty(document, "visibilityState", { get: () => "hidden", configurable: true });
            document.dispatchEvent(new Event("visibilitychange"));
        }""")
        expect(status.filter(has_text=f"Reply sent to {state['name'].rstrip('.')}.")).to_be_visible(timeout=2000)
    check("Switching apps inside the undo window sends the reply at once", hidden_sends_now)

    browser.close()

for verdict, name in results:
    print(verdict, name)
print("page errors:", "; ".join(errors) or "none")
sys.exit(any(v == "FAIL" for v, _ in results) or bool(errors))
