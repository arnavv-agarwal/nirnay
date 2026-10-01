"""A phone and a laptop working the same inbox at once, in real browsers, several rounds.

    python tests/e2e/two_devices.py [rounds]      # default 3; API (8000) and web app (3000) running
    NIRNAY_WEB=https://nirnay-sandy.vercel.app python tests/e2e/two_devices.py 1

What one device does, the other must see: a ticket made on the phone, a reply sent from the
laptop, a correction, a reopened reply, a new threshold. The phone runs WebKit (Safari's
engine), the laptop Chromium. Each round triages new tickets with the AI (about 3 cents each).
"""
import os
import re
import sys
import time

from playwright.sync_api import expect, sync_playwright

BASE = os.environ.get("NIRNAY_WEB", "http://localhost:3000")
ROUNDS = int(sys.argv[1]) if len(sys.argv) > 1 else 3
SEARCH = "Search name, ticket or message"
ESCALATES = "mera account block ho gaya hai, 3 baar mail kiya koi reply nahi. bahut pareshan hu"

results = []


def check(name, fn):
    try:
        fn()
        results.append(("PASS", name))
    except Exception as e:  # noqa: BLE001
        lines = [l for l in str(e).splitlines() if l.strip()]
        where = next((l.strip() for l in lines if "waiting for" in l), "")
        results.append(("FAIL", f"{name}: {lines[0][:140]} | {where[:160]}"))


def new_ticket(page, name, text):
    page.get_by_role("button", name="New ticket").click()
    page.get_by_label("Student name").fill(name)
    page.get_by_label("Message").fill(text)
    page.get_by_role("button", name="Triage ticket").click()
    expect(page.get_by_role("heading", name=name)).to_be_visible(timeout=60000)


def find(page, name, phone=False):
    """Reload (the inbox doesn't refresh itself), search every queue, open the ticket."""
    page.goto(BASE, wait_until="networkidle")
    page.get_by_placeholder(SEARCH).fill(name)
    page.locator("ol li button", has_text=name).first.click()
    expect(page.locator("#conv-title")).to_have_text(name)


def back_to_list(page):
    button = page.get_by_role("button", name="All tickets")
    if button.is_visible():
        button.click()


with sync_playwright() as p:
    phone_browser, laptop_browser = p.webkit.launch(), p.chromium.launch()
    phone = phone_browser.new_context(**p.devices["iPhone 13"]).new_page()
    laptop = laptop_browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    for page in (phone, laptop):
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(BASE, wait_until="networkidle")

    for r in range(1, ROUNDS + 1):
        stamp = time.strftime("%H%M%S")
        made_on_phone, made_on_laptop = f"Phone R{r} {stamp}", f"Laptop R{r} {stamp}"

        def phone_ticket_on_laptop():
            new_ticket(phone, made_on_phone, ESCALATES)
            find(laptop, made_on_phone)
            expect(laptop.locator("aside").get_by_text("why this needs you")).to_be_visible()
        check(f"R{r} ticket made on the phone shows on the laptop, with its reasons", phone_ticket_on_laptop)

        def laptop_reply_on_phone():
            laptop.get_by_role("button", name="Use Nirnay's draft").click()
            laptop.get_by_role("button", name="Send reply").click()
            expect(laptop.get_by_role("status").filter(has_text=f"Reply sent to {made_on_phone}")).to_be_visible(timeout=10000)
            find(phone, made_on_phone)
            expect(phone.get_by_text("Sent by an agent")).to_be_visible()
            back_to_list(phone)
        check(f"R{r} reply sent on the laptop shows as sent on the phone", laptop_reply_on_phone)

        def laptop_ticket_answered_on_phone():
            new_ticket(laptop, made_on_laptop, ESCALATES)
            find(phone, made_on_laptop)
            phone.get_by_role("button", name="Use Nirnay's draft").click()
            phone.get_by_role("button", name="Send reply").click()
            expect(phone.get_by_role("status").filter(has_text=f"Reply sent to {made_on_laptop}")).to_be_visible(timeout=10000)
            find(laptop, made_on_laptop)
            expect(laptop.get_by_text("Sent by an agent")).to_be_visible()
        check(f"R{r} ticket made on the laptop, answered on the phone, shows as sent on the laptop", laptop_ticket_answered_on_phone)

        def no_double_send():
            name = f"Both R{r} {stamp}"
            new_ticket(laptop, name, ESCALATES)
            find(phone, name)                                       # both have it open
            laptop.get_by_role("button", name="Use Nirnay's draft").click()
            laptop.get_by_role("button", name="Send reply").click()
            expect(laptop.get_by_role("status").filter(has_text=f"Reply sent to {name}")).to_be_visible(timeout=10000)
            phone.get_by_role("button", name="Use Nirnay's draft").click()   # the phone still shows it open
            phone.get_by_role("button", name="Send reply").click()
            expect(phone.get_by_role("status").filter(has_text="already")).to_be_visible(timeout=10000)
            back_to_list(phone)
        check(f"R{r} a ticket answered on the laptop can't be answered twice from the phone", no_double_send)

        def correction_both_ways():
            find(phone, made_on_laptop)
            phone.get_by_role("button", name="Topic wrong? Correct it").click()
            phone.get_by_label("Payment").check()
            phone.get_by_role("button", name="Save correction").click()
            expect(phone.get_by_text("Corrected by an agent to")).to_be_visible(timeout=10000)
            find(laptop, made_on_laptop)
            expect(laptop.get_by_text("Corrected by an agent to")).to_be_visible()
            back_to_list(phone)
        check(f"R{r} topic corrected on the phone shows on the laptop", correction_both_ways)

        def reopen_on_laptop_seen_on_phone():
            laptop.goto(BASE, wait_until="networkidle")
            laptop.get_by_role("tab", name="Auto-resolved").click()
            laptop.locator("ol li button[class*=row]").first.click()
            name = laptop.locator("#conv-title").inner_text()
            laptop.get_by_role("button", name="Should a person handle this? Reopen it").first.click()
            expect(laptop.get_by_role("status").filter(has_text="is back in Needs you")).to_be_visible()
            phone.goto(BASE, wait_until="networkidle")
            phone.get_by_role("tab", name="Needs you").click()
            phone.get_by_placeholder(SEARCH).fill(name)
            phone.locator("ol li button", has_text=name).first.click()
            expect(phone.get_by_text("reopened by an agent")).to_be_visible()
            back_to_list(phone)
        check(f"R{r} automatic reply reopened on the laptop is back in Needs you on the phone", reopen_on_laptop_seen_on_phone)

    def threshold_both_ways():
        laptop.goto(BASE + "/quality", wait_until="networkidle")
        laptop.get_by_role("slider").fill("0.9")
        laptop.get_by_role("button", name="Use 0.90 in the live inbox").click()
        expect(laptop.get_by_text("Live inbox now uses 0.90 for new tickets")).to_be_visible(timeout=10000)
        phone.goto(BASE + "/quality", wait_until="networkidle")
        expect(phone.get_by_text("Live inbox uses 0.90")).to_be_visible()
        laptop.get_by_role("slider").fill("0.8")
        laptop.get_by_role("button", name="Use 0.80 in the live inbox").click()
        expect(laptop.get_by_text("Live inbox now uses 0.80 for new tickets")).to_be_visible(timeout=10000)
    check("Threshold set on the laptop shows on the phone, then restored", threshold_both_ways)

    def live_without_reload():
        laptop.goto(BASE, wait_until="networkidle")             # the laptop just sits on the inbox
        name = f"Live {time.strftime('%H%M%S')}"
        phone.goto(BASE, wait_until="networkidle")
        new_ticket(phone, name, ESCALATES)
        expect(laptop.locator("ol li button", has_text=name)).to_be_visible(timeout=30000)
    check("A ticket made on the phone appears on an open laptop inbox without a reload (30 s)", live_without_reload)

    phone_browser.close()
    laptop_browser.close()

for verdict, name in results:
    print(verdict, name)
print("page errors:", "; ".join(errors) or "none")
sys.exit(any(v == "FAIL" for v, _ in results) or bool(errors))
