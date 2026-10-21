"""
Visual Verification script for BrowseGuard Gateway 3: Email Security & API Integration Portal.
"""

import time
from playwright.sync_api import sync_playwright

def run():
    print("Starting Email Gateway & API Portal walkthrough...")
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 950})
        page = context.new_page()

        # Step 1: Open Dashboard
        print("Step 1: Navigating to http://localhost:5173...")
        page.goto("http://localhost:5173", wait_until="networkidle")
        page.wait_for_timeout(1000)

        # Step 2: Switch to Email Gateway & API Tab
        print("Step 2: Switching to Email Gateway & API tab...")
        page.locator("button:has-text('Email Gateway & API')").click()
        page.wait_for_timeout(1500)
        page.screenshot(path="demo_7_email_gateway_portal.png", full_page=True)
        print("[OK] Email Gateway & API portal overview captured.")

        # Step 3: Test Email Playground with Phishing Preset
        print("Step 3: Loading Phishing preset in Email Playground...")
        page.locator("button:has-text('Load Phishing Preset')").click()
        page.wait_for_timeout(500)

        print("Detonating email links...")
        page.locator("button:has-text('Extract & Detonate')").click()
        page.wait_for_selector("text=Extracted", timeout=15000)
        page.wait_for_timeout(2000)
        page.screenshot(path="demo_8_email_links_extracted.png", full_page=True)
        print("[OK] Email links extracted and sandbox queued captured.")

        # Step 4: Test Direct Click-Time Rewritten Isolation URL (?isolate=...)
        print("Step 4: Testing Direct Click-Time Isolation link...")
        page.goto("http://localhost:5173/?isolate=https://example.com", wait_until="networkidle")
        page.wait_for_selector(".rbi-window", timeout=15000)
        page.wait_for_timeout(2000)
        page.screenshot(path="demo_9_direct_click_time_rbi.png")
        print("[OK] Direct Click-Time Browser Isolation captured.")

        browser.close()
        print("Email Gateway walkthrough completed successfully!")

if __name__ == "__main__":
    run()
