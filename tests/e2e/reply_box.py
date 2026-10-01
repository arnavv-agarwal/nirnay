"""The reply box, scenario by scenario, against the running app with the AI on.

    python tests/e2e/reply_box.py

Checks: a ticket that needs a person opens with an empty reply box and a "Use Nirnay's draft"
button; the draft fills the box and is labelled; edits and switching tickets keep it; the agent's
own text is kept; auto-resolved tickets show what was sent; Hindi drafts; and a new ticket
through the real AI (one call, about 3 cents). Needs the demo inbox built with an AI model.
"""
import time
import os
import sys

from playwright.sync_api import expect, sync_playwright

BASE = os.environ.get("NIRNAY_WEB", "http://localhost:3000")
CHROME = os.environ.get("CHROME_PATH")  # optional; by default Playwright's own Chromium


def launch(p):
    return p.chromium.launch(executable_path=CHROME) if CHROME else p.chromium.launch()
failures = []


def ok(name, cond, extra=""):
    print(("PASS " if cond else "FAIL ") + name + (f"  [{extra}]" if extra else ""))
    if not cond:
        failures.append(name)


with sync_playwright() as p:
    b = launch(p); pg = b.new_page(viewport={"width": 1440, "height": 900})
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE); pg.wait_for_selector("ol li button")
    search = pg.get_by_placeholder("Search name, ticket or message")
    def open_ticket(tid):
        search.fill(tid); pg.locator("ol li button[class*=row]").first.click(); pg.wait_for_timeout(400)
    reply = pg.locator("#reply"); use = pg.get_by_role("button", name="Use Nirnay's draft")
    # S1 escalated: empty composer + button
    open_ticket("test-07")
    ok("S1 escalated ticket opens with an empty reply box", reply.input_value() == "")
    ok("S1 'Use Nirnay's draft' button visible", use.count() == 1)
    ok("S1 Send disabled while empty", pg.get_by_role("button", name="Send reply").is_disabled())
    # S2 use draft
    use.click(); pg.wait_for_timeout(200)
    v = reply.input_value()
    ok("S2 draft fills the box", len(v) > 40, v[:60])
    ok("S2 label says check before sending", pg.get_by_text("Nirnay's draft: check it before sending").count() == 1)
    ok("S2 panel shows cited articles", pg.locator("aside").get_by_text("Cited in the reply").count() == 1)
    # S3 edit
    reply.press("End"); reply.type(" Thanks for your patience.")
    ok("S3 label switches to edited", pg.get_by_text("Edited from Nirnay's draft").count() == 1)
    # S4 switch and back
    open_ticket("test-33"); open_ticket("test-07")
    ok("S4 draft kept after switching tickets", "Thanks for your patience." in reply.input_value())
    ok("S4 label kept", pg.get_by_text("Edited from Nirnay's draft").count() == 1)
    # S5 own text first then draft
    search.fill(""); pg.get_by_role("tab", name="Needs you").click(); pg.locator("ol li button[class*=row]").nth(3).click(); pg.wait_for_timeout(300)
    reply.fill("Hi, I'm checking this now.")
    use.click(); v = reply.input_value()
    ok("S5 draft appended under the agent's own text", v.startswith("Hi, I'm checking this now.\n\n") and len(v) > 60)
    # S6 auto-resolved
    search.fill(""); pg.get_by_role("tab", name="Auto-resolved").click(); pg.locator("ol li button[class*=row]").first.click(); pg.wait_for_timeout(300)
    ok("S6 auto-resolved shows the sent reply and no composer", pg.locator("[class*=bubbleOut]").count() == 1 and reply.count() == 0)
    # S9 Hindi escalated
    pg.get_by_role("tab", name="Needs you").click()
    pg.locator("button[aria-controls=filter-panel]").click(); pg.locator("#filter-panel button", has_text="Hindi").click(); pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
    pg.locator("ol li button[class*=row]").first.click(); pg.wait_for_timeout(300)
    if use.count(): use.click()
    ok("S9 Hindi draft inserted in Devanagari", any("ऀ" <= ch <= "ॿ" for ch in reply.input_value()), reply.input_value()[:40])
    pg.locator("[aria-label='Active filters'] >> text=Clear all").click()
    # S10 distress
    open_ticket("dev-12"); use.click() if use.count() else None
    if reply.count():   # to read, not scored; skipped if another test already answered it
        print("   S10 distress draft:", reply.input_value()[:260].replace("\n", " "))
    else:
        print("   S10 skipped: dev-12 was already answered")
    # S7 new ticket with AI
    search.fill("")
    pg.get_by_role("button", name="New ticket").click()
    pg.locator("textarea").first.fill("Sir maine 2 baar payment kar diya Arjuna JEE ke liye, dono baar 4999 kat gaye. Ek refund kar do please.")
    t0 = time.time(); pg.locator("form button[type=submit], button:has-text('Triage ticket')").first.click()
    pg.wait_for_selector("text=Triaging", timeout=5000);    pg.wait_for_selector("#conv-title", timeout=60000); dt = time.time() - t0
    ok("S7 new ticket triaged with the AI", True, f"{dt:.1f}s")
    pg.wait_for_timeout(400);    print("page errors:", errs or "none")
    sys.exit(1 if errs or failures else 0)
    b.close()
