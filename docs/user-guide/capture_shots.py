#!/usr/bin/env python3
"""Capture clean full-viewport screenshots for the Client User Guide."""

from __future__ import annotations

import json
from pathlib import Path

from playwright.sync_api import sync_playwright

SHOT = Path(__file__).resolve().parent / "screenshots"
SHOT.mkdir(parents=True, exist_ok=True)
BASE = "http://localhost:5173"
API = "http://localhost:4001"
EMAIL = "habib@gmail.com"
PASSWORD = "samhal123"
W, H = 1440, 900


def save(page, name: str) -> None:
    path = SHOT / name
    page.screenshot(path=str(path), full_page=False, type="png")
    print(f"saved {path.name} ({path.stat().st_size} bytes) url={page.url}")


def wait_app(page) -> None:
    page.wait_for_url("**/app**", timeout=20000)
    page.get_by_role("heading", name="Dashboard").first.wait_for(timeout=20000)
    page.wait_for_timeout(800)


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": W, "height": H},
            device_scale_factor=1,
        )
        page = context.new_page()

        # Auth pages (logged out)
        page.goto(f"{BASE}/auth/sign-up", wait_until="domcontentloaded")
        page.wait_for_timeout(1000)
        save(page, "01-signup.png")

        page.goto(f"{BASE}/auth", wait_until="domcontentloaded")
        page.wait_for_timeout(1000)
        save(page, "02-signin.png")

        # Establish refresh cookie on API host, then boot SPA session
        login = context.request.post(
            f"{API}/auth/login",
            data=json.dumps({"email": EMAIL, "password": PASSWORD, "rememberMe": True}),
            headers={
                "Origin": BASE,
                "Referer": f"{BASE}/auth",
                "Content-Type": "application/json",
            },
        )
        print("api login", login.status)
        if login.status >= 400:
            raise RuntimeError(login.text()[:300])

        page.goto(f"{BASE}/app", wait_until="networkidle")
        wait_app(page)
        save(page, "03-dashboard.png")

        # New Meeting menu
        page.get_by_role("button", name="New Meeting").click()
        page.get_by_text("Instant meeting").first.wait_for(timeout=5000)
        page.wait_for_timeout(400)
        save(page, "04-new-meeting-menu.png")

        # Instant meeting
        page.get_by_text("Instant meeting", exact=True).click()
        page.get_by_role("heading", name="Start instant meeting").wait_for(timeout=8000)
        page.wait_for_timeout(500)
        save(page, "05-instant-meeting-dialog.png")
        page.get_by_role("button", name="Cancel").click()
        page.wait_for_timeout(400)

        # Scheduled meeting
        page.get_by_role("button", name="New Meeting").click()
        page.get_by_text("Scheduled meeting", exact=True).click()
        page.get_by_role("heading", name="Schedule a meeting").wait_for(timeout=8000)
        page.wait_for_timeout(500)
        save(page, "06-scheduled-meeting-dialog.png")
        page.get_by_role("button", name="Cancel").click()
        page.wait_for_timeout(400)

        routes = [
            ("/app/meetings", "04-meetings.png", "Meetings"),
            ("/app/calendar", "05-calendar.png", "Calendar"),
            ("/app/contacts", "06-contacts.png", "Contacts"),
            ("/app/messages", "07-messages.png", "Messages"),
            ("/app/recordings", "08-recordings.png", "Recordings"),
            ("/app/templates", "10-templates.png", "Templates"),
            ("/app/reports", "11-reports.png", "Reports"),
            ("/app/ai-insights", "12-ai-insights.png", "AI Insights"),
            ("/app/settings", "13-settings.png", "Settings"),
        ]
        for route, name, heading in routes:
            page.goto(f"{BASE}{route}", wait_until="networkidle")
            page.wait_for_timeout(900)
            save(page, name)

        # Members + Create User
        page.goto(f"{BASE}/app/settings/members", wait_until="networkidle")
        page.get_by_role("heading", name="Members").first.wait_for(timeout=15000)
        page.wait_for_timeout(600)
        save(page, "07-members.png")
        page.get_by_role("button", name="Invite Members").click()
        page.wait_for_url("**/settings/invite**", timeout=15000)
        page.get_by_role("heading", name="Create User").first.wait_for(timeout=10000)
        page.wait_for_timeout(700)
        save(page, "09-create-user.png")

        # Rooms + Create Room
        page.goto(f"{BASE}/app/settings/rooms", wait_until="networkidle")
        page.get_by_role("heading", name="Rooms").first.wait_for(timeout=15000)
        page.wait_for_timeout(600)
        save(page, "08-rooms-full.png")
        page.get_by_role("button", name="Create Room").first.click()
        page.wait_for_url("**/create-room**", timeout=15000)
        page.get_by_role("heading", name="Create Room").first.wait_for(timeout=10000)
        page.wait_for_timeout(700)
        save(page, "10-create-room.png")

        # Billing
        page.goto(f"{BASE}/app/settings/billing", wait_until="networkidle")
        page.wait_for_timeout(1000)
        save(page, "11-billing-summary.png")

        page.goto(f"{BASE}/app/billing", wait_until="networkidle")
        page.get_by_role("heading", name="Billing & Plan").first.wait_for(timeout=15000)
        page.wait_for_timeout(1000)
        save(page, "12-billing-plans.png")

        btn = page.get_by_role("button", name="Pay $49.00 · Upgrade to Pro")
        if btn.count():
            btn.click()
            page.get_by_role("heading", name="Upgrade to Pro").wait_for(timeout=8000)
            page.wait_for_timeout(600)
            save(page, "13-upgrade-payment.png")

        browser.close()
        print("done")


if __name__ == "__main__":
    main()
