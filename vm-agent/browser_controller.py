from playwright.sync_api import sync_playwright


def open_url(url):
    with sync_playwright() as p:

        browser = p.chromium.launch(
            headless=False
        )

        page = browser.new_page()

        page.goto(url, wait_until="load", timeout=30000)

        title = page.title()

        browser.close()

        return {
            "title": title
        }
