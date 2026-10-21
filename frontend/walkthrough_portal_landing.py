"""
Visual verification of the new Dedicated Multi-Product Landing Page & Refined ANY.RUN Dark SOC Theme.
"""

from playwright.sync_api import sync_playwright

def run():
    print("Starting Multi-Product Landing Page & Refined ANY.RUN Theme walkthrough...")
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 950})
        page = context.new_page()

        # Step 1: Open Homepage / Product Portal
        print("Step 1: Navigating to http://localhost:5173...")
        page.goto("http://localhost:5173", wait_until="networkidle")
        page.wait_for_timeout(1500)
        page.screenshot(path="landing_1_product_hub.png", full_page=True)
        print("[OK] Multi-Product Landing Page captured.")

        # Step 2: Click Launch Sandbox Studio
        print("Step 2: Clicking Launch Sandbox Studio...")
        page.locator("button:has-text('Open Sandbox Studio')").click()
        page.wait_for_timeout(1000)
        page.screenshot(path="landing_2_sandbox_studio.png", full_page=True)
        print("[OK] Navigated into ANY.RUN Sandbox Studio.")

        # Step 3: Return to Portal Hub
        print("Step 3: Returning to Portal Hub...")
        page.locator("button:has-text('Back to Portal Hub')").click()
        page.wait_for_timeout(500)

        # Step 4: Click Email Gateway & API
        print("Step 4: Clicking Configure API & Mail Gateway...")
        page.locator("button:has-text('Configure API & Mail Gateway')").click()
        page.wait_for_timeout(1000)
        page.screenshot(path="landing_3_email_gateway.png", full_page=True)
        print("[OK] Navigated into Email Security & API Gateway.")

        # Step 5: Return and open Extension Modal
        print("Step 5: Returning to Portal Hub and opening Extension Pairing modal...")
        page.locator("button:has-text('Back to Portal Hub')").click()
        page.wait_for_timeout(500)
        page.locator("button:has-text('Pair Extension Token')").click()
        page.wait_for_timeout(1000)
        page.screenshot(path="landing_4_auth_extension.png")
        print("[OK] Extension Pairing modal captured.")

        browser.close()
        print("Walkthrough finished successfully!")

if __name__ == "__main__":
    run()
