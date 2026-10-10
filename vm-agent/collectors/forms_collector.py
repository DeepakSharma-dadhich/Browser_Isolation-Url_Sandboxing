"""
Form and Credential Harvesting collector for BrowseGuard.

Inspects HTML forms and input elements in the DOM to identify credential phishing,
insecure form actions, off-domain data exfiltration targets, and payment lures.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlsplit

from playwright.sync_api import Page


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


DOM_EXTRACT_FORMS_SCRIPT = """
() => {
    const forms = [];
    const formElements = Array.from(document.querySelectorAll('form'));

    for (let i = 0; i < formElements.length; i++) {
        const form = formElements[i];
        let action = form.getAttribute('action') || '';
        let resolvedAction = '';
        try {
            resolvedAction = new URL(action, document.baseURI).href;
        } catch {
            resolvedAction = action;
        }

        const method = (form.getAttribute('method') || 'GET').toUpperCase();
        const inputs = Array.from(form.querySelectorAll('input, select, textarea'));

        let passwordFields = [];
        let emailFields = [];
        let textFields = [];
        let hiddenFields = [];
        let cardFields = [];

        for (const input of inputs) {
            const type = (input.getAttribute('type') || input.tagName.toLowerCase()).toLowerCase();
            const name = input.getAttribute('name') || '';
            const id = input.getAttribute('id') || '';
            const autocomplete = input.getAttribute('autocomplete') || '';
            const placeholder = input.getAttribute('placeholder') || '';

            const fieldInfo = {
                type: type,
                name: name,
                id: id,
                autocomplete: autocomplete,
                placeholder: placeholder
            };

            const combinedText = `${name} ${id} ${placeholder} ${autocomplete}`.toLowerCase();

            if (type === 'password') {
                passwordFields.push(fieldInfo);
            } else if (type === 'email' || combinedText.includes('email') || combinedText.includes('user') || combinedText.includes('login') || combinedText.includes('username')) {
                emailFields.push(fieldInfo);
            } else if (type === 'hidden') {
                hiddenFields.push(fieldInfo);
            } else if (combinedText.includes('card') || combinedText.includes('cvv') || combinedText.includes('cvc') || combinedText.includes('cc-number')) {
                cardFields.push(fieldInfo);
            } else {
                textFields.push(fieldInfo);
            }
        }

        forms.push({
            index: i + 1,
            id: form.getAttribute('id') || null,
            name: form.getAttribute('name') || null,
            action: action,
            resolved_action: resolvedAction,
            method: method,
            total_inputs: inputs.length,
            password_field_count: passwordFields.length,
            password_fields: passwordFields,
            email_field_count: emailFields.length,
            email_fields: emailFields,
            hidden_field_count: hiddenFields.length,
            card_field_count: cardFields.length,
            card_fields: cardFields,
            text_field_count: textFields.length
        });
    }

    // Also detect standalone password inputs outside <form> tags (common in single-page apps or phishing kits)
    const orphanPasswords = Array.from(document.querySelectorAll('input[type="password"]'))
        .filter(input => !input.closest('form'))
        .map(input => ({
            type: 'password',
            name: input.getAttribute('name') || '',
            id: input.getAttribute('id') || '',
            placeholder: input.getAttribute('placeholder') || ''
        }));

    return {
        forms: forms,
        orphan_passwords: orphanPasswords
    };
}
"""


def extract_hostname(url: str | None) -> str | None:
    if not url:
        return None
    try:
        host = urlsplit(url).hostname
        return host.lower() if host else None
    except Exception:
        return None


def collect_forms(
    page: Page,
) -> dict[str, Any]:
    """
    Evaluate DOM forms and inspect credential harvesting indicators.
    """
    page_url = page.url or ""
    page_hostname = extract_hostname(page_url)
    is_page_https = page_url.lower().startswith("https://")

    try:
        dom_result = page.evaluate(DOM_EXTRACT_FORMS_SCRIPT)
    except Exception as exc:
        return {
            "collected_at": utc_now_iso(),
            "form_count": 0,
            "has_login_form": False,
            "has_password_field": False,
            "has_cross_domain_submission": False,
            "has_insecure_submission": False,
            "forms": [],
            "orphan_password_inputs": [],
            "error": {
                "type": type(exc).__name__,
                "message": str(exc),
            },
        }

    raw_forms = dom_result.get("forms", [])
    orphan_passwords = dom_result.get("orphan_passwords", [])

    total_password_fields = len(orphan_passwords)
    has_login_form = False
    has_cross_domain_action = False
    has_insecure_action = False
    has_credit_card_inputs = False
    suspicious_indicators = []

    processed_forms = []

    for f in raw_forms:
        pwd_count = f.get("password_field_count", 0)
        email_count = f.get("email_field_count", 0)
        card_count = f.get("card_field_count", 0)
        resolved_action = f.get("resolved_action", "")
        action_host = extract_hostname(resolved_action)

        total_password_fields += pwd_count

        if pwd_count > 0:
            if email_count > 0:
                has_login_form = True

        if card_count > 0:
            has_credit_card_inputs = True

        # Check action destination
        is_cross_domain = False
        if action_host and page_hostname:
            if not (
                action_host == page_hostname
                or action_host.endswith("." + page_hostname)
                or page_hostname.endswith("." + action_host)
            ):
                is_cross_domain = True
                has_cross_domain_action = True

        is_insecure = False
        if resolved_action.lower().startswith("http://") and is_page_https:
            is_insecure = True
            has_insecure_action = True

        if pwd_count > 0 and is_cross_domain:
            suspicious_indicators.append(
                f"Form {f.get('index')} submits password to third-party domain: {action_host}"
            )

        if pwd_count > 0 and not is_page_https:
            suspicious_indicators.append(
                f"Form {f.get('index')} submits credentials on unencrypted HTTP page"
            )

        f["is_cross_domain_action"] = is_cross_domain
        f["is_insecure_submission"] = is_insecure
        f["action_hostname"] = action_host
        processed_forms.append(f)

    if orphan_passwords:
        suspicious_indicators.append(
            f"Found {len(orphan_passwords)} standalone password input field(s) outside <form> element"
        )

    return {
        "collected_at": utc_now_iso(),
        "form_count": len(processed_forms),
        "total_password_fields": total_password_fields,
        "has_password_field": total_password_fields > 0,
        "has_login_form": has_login_form,
        "has_cross_domain_submission": has_cross_domain_action,
        "has_insecure_submission": has_insecure_action,
        "has_credit_card_inputs": has_credit_card_inputs,
        "suspicious_indicators": suspicious_indicators,
        "forms": processed_forms,
        "orphan_password_inputs": orphan_passwords,
    }