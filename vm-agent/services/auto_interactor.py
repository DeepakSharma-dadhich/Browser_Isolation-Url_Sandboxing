"""
Automated Interactivity & Anti-Cloaking Engine.

Simulates automated human interaction to bypass pre-detonation click walls,
fake Turnstile / CAPTCHA buttons, and 'View Document' lures designed to cloak
phishing kits from static scanners.
"""

from __future__ import annotations

import re
from typing import Any
from playwright.sync_api import Page, TimeoutError as PlaywrightTimeoutError

from utils.logging_utils import configure_logging

logger = configure_logging("vm_agent.services.auto_interactor")

LURE_BUTTON_REGEX = re.compile(
    r"^\s*(verify(\s+you\s+are\s+human)?|i\s+am\s+(not\s+a\s+robot|human)|"
    r"continue\s+to\s+(document|file|download|secure)|proceed\s+to\s+(file|document|download)|view\s+(document|file|invoice|message)|"
    r"access\s+(document|secure\s+message)|open\s+(document|file)|"
    r"click\s+here\s+to\s+(continue|view|verify))\s*$",
    re.IGNORECASE
)


def perform_automated_interactivity(page: Page, max_actions: int = 1) -> dict[str, Any]:
    """
    Scan the page for anti-analysis click walls or document lures and interact with them.
    Returns a record of actions taken for evidence and threat scoring.
    """
    interaction_record: dict[str, Any] = {
        "attempted": True,
        "interacted": False,
        "actions": []
    }

    try:
        # 1. Cloudflare Turnstile / Anti-Bot Challenge Checkbox Handling
        try:
            for frame in page.frames:
                frame_url = getattr(frame, "url", "")
                if "challenges.cloudflare.com" in frame_url or "turnstile" in frame_url or "cf-chl" in frame_url:
                    logger.info("Anti-cloaking engine identified Cloudflare Turnstile frame: %s", frame_url)
                    checkbox = frame.query_selector("input[type='checkbox'], #challenge-stage, .ctp-checkbox-label, div[role='checkbox']")
                    if checkbox:
                        logger.info("Clicking Cloudflare Turnstile challenge box")
                        checkbox.hover(timeout=1000)
                        checkbox.click(timeout=1500)
                        page.wait_for_timeout(3500)
                        interaction_record["interacted"] = True
                        interaction_record["actions"].append({
                            "button_text": "Cloudflare Turnstile Checkbox",
                            "initial_url": page.url,
                            "url_after_click": page.url,
                            "caused_redirect": False
                        })
                        break
        except Exception as cf_err:
            logger.debug("Cloudflare Turnstile auto-click note: %s", cf_err)

        # 2. Search candidate interactive elements on main DOM
        candidate_selectors = [
            "button",
            "a",
            "input[type='button']",
            "input[type='submit']",
            "div[role='button']",
            "span[role='button']"
        ]

        elements = page.query_selector_all(", ".join(candidate_selectors))
        for el in elements:
            try:
                if not el.is_visible():
                    continue

                text = (el.inner_text() or el.get_attribute("value") or "").strip()
                if not text:
                    continue

                if LURE_BUTTON_REGEX.search(text):
                    logger.info("Anti-cloaking engine identified suspicious lure/gate button: '%s'", text)
                    
                    initial_url = page.url
                    # Simulate human click
                    el.hover(timeout=1000)
                    el.click(timeout=1500)
                    
                    # Allow secondary payload / redirect to settle
                    page.wait_for_timeout(2000)
                    new_url = page.url

                    action = {
                        "button_text": text,
                        "initial_url": initial_url,
                        "url_after_click": new_url,
                        "caused_redirect": (initial_url != new_url)
                    }
                    interaction_record["interacted"] = True
                    interaction_record["actions"].append(action)
                    logger.info("Successfully interacted with button '%s'. Redirect triggered: %s", text, action["caused_redirect"])
                    break
            except (PlaywrightTimeoutError, Exception) as elem_err:
                logger.debug("Element interaction skipped: %s", elem_err)

    except Exception as exc:
        logger.debug("Automated interactivity pass completed with note: %s", exc)

    return interaction_record
