"""
Live Interactive Visual Walkthrough of BrowseGuard Platform.
Runs using installed Chrome via Playwright and captures full-resolution screenshots.
"""

import time
from playwright.sync_api import sync_playwright

def run_walkthrough():
    print("Starting BrowseGuard live visual walkthrough...")
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 950})
        page = context.new_page()

        # Step 1: Open Dashboard
        print("Step 1: Navigating to http://localhost:5173...")
        page.goto("http://localhost:5173", wait_until="networkidle")
        page.screenshot(path="demo_1_homepage.png")
        print("[OK] Homepage captured.")

        # Step 2: Open Auth & Extension Token Modal
        print("Step 2: Opening Identity & Extension Modal...")
        page.locator("button:has-text('Extension:')").click()
        page.wait_for_timeout(1000)
        page.screenshot(path="demo_2_auth_modal.png")
        print("[OK] Auth Modal captured.")

        # Click Close
        page.locator("button:has-text('Close')").click()
        page.wait_for_timeout(500)

        # Step 3: Run a Scan with BrowseGuard on HTTP Redirect Chain
        print("Step 3: Clicking HTTP Redirect Chain preset and scanning...")
        page.locator("button:has-text('HTTP Redirect Chain')").click()
        page.wait_for_timeout(500)
        page.locator("button:has-text('Scan with BrowseGuard')").click()
        
        # Wait for BrowseGuard studio results layout to appear
        print("Waiting for PostgreSQL queue execution to finish...")
        page.wait_for_selector(".anyrun-hud", timeout=35000)
        page.wait_for_timeout(2000)
        page.screenshot(path="demo_3_scan_results.png", full_page=True)
        print("[OK] BrowseGuard Studio Scan Results, Viewport & Threat Rail captured.")

        # Step 3b: Switch to IOCs & MITRE ATT&CK Tab
        print("Step 3b: Switching to Threat Intelligence & IOCs drawer tab...")
        page.locator("button:has-text('Threat Intelligence & IOCs')").click()
        page.wait_for_timeout(1000)
        page.screenshot(path="demo_3b_iocs_mitre.png", full_page=True)
        print("[OK] IOCs and MITRE ATT&CK drawer tab captured.")

        # Step 4: Open Past Scans Tab
        print("Step 4: Checking Past Scans Tab...")
        page.locator("button:has-text('Past Scans')").click()
        page.wait_for_timeout(1000)
        page.screenshot(path="demo_4_past_scans.png", full_page=True)
        print("[OK] Past Scans table captured.")

        # Step 5: Launch Live Interactive RBI Isolation Modal
        print("Step 5: Launching Live Interactive RBI Isolation Session...")
        page.locator("button:has-text('URL Scanner')").click()
        page.wait_for_timeout(500)
        page.locator("button:has-text('Launch Live Isolation (RBI)')").click()
        
        # Wait for live isolation modal to connect
        print("Waiting for RBI live stream canvas...")
        page.wait_for_selector(".rbi-window", timeout=15000)
        page.wait_for_timeout(3000)
        page.screenshot(path="demo_5_live_rbi_stream.png")
        print("[OK] Live RBI session captured.")

        # Click +60s Extend button
        print("Clicking +60s Extend button in RBI session...")
        extend_btn = page.locator("button:has-text('+60s Extend')")
        if extend_btn.is_visible():
            extend_btn.click()
            page.wait_for_timeout(500)
            page.screenshot(path="demo_6_rbi_extended.png")
            print("[OK] RBI timer extension captured.")

        # Exit Isolation
        page.locator("button:has-text('Exit Isolation')").click()
        page.wait_for_timeout(500)

        browser.close()
        print("Walkthrough completed successfully! All visual evidence saved.")

if __name__ == "__main__":
    run_walkthrough()
