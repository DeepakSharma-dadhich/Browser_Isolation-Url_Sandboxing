"""
Advanced Phishing & Behavioral Deception Heuristics for BrowseGuard.

Detects sophisticated modern social engineering and evasion techniques:
1. CLICKFIX-001: Fake CAPTCHA / Cloudflare Turnstile "Press Win+R then Ctrl+V" Paste Lure
2. OAUTH-001: OAuth 2.0 Device Authorization Grant Phishing (Device Code Hijacking)
3. SCARED-001: Tech Support Scam & Fake Security Lockout Lures (Scareware)
4. UPDATE-001: Fake Browser Update Lures (SocGholish / FakeUpdates vector)
5. CLIP-001: Malicious Clipboard Hijacking (PowerShell / Shell Command Injection)
"""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlsplit


def extract_hostname(url: str | None) -> str | None:
    """Extract lowercase hostname from a URL."""
    if not url or not isinstance(url, str):
        return None
    try:
        host = urlsplit(url).hostname
        return host.lower() if host else None
    except Exception:
        return None


def is_domain_match(hostname: str | None, trusted_domains: list[str] | set[str]) -> bool:
    """Check if hostname matches or is a subdomain of any trusted domain."""
    if not hostname:
        return False
    host = hostname.lower()
    for domain in trusted_domains:
        domain_lower = domain.lower()
        if host == domain_lower or host.endswith("." + domain_lower):
            return True
    return False


# Official vendor domains for browsers and device auth
LEGIT_OAUTH_DEVICE_DOMAINS = {
    "microsoft.com",
    "microsoftonline.com",
    "live.com",
    "google.com",
    "github.com",
    "apple.com",
}

LEGIT_BROWSER_DOMAINS = {
    "google.com",
    "googleblog.com",
    "chromestatus.com",
    "microsoft.com",
    "mozilla.org",
    "firefox.com",
    "apple.com",
    "brave.com",
    "opera.com",
}

# Malicious clipboard cradle indicators
SUSPICIOUS_CMD_PATTERNS = [
    re.compile(r"\bpowershell(?:\.exe)?\b", re.IGNORECASE),
    re.compile(r"\bcmd(?:\.exe)?\s*/c\b", re.IGNORECASE),
    re.compile(r"\bmshta(?:\.exe)?\b", re.IGNORECASE),
    re.compile(r"\b(?:iex|invoke-expression)\b", re.IGNORECASE),
    re.compile(r"\b(?:iwr|invoke-webrequest)\b", re.IGNORECASE),
    re.compile(r"\bdownloadstring\b", re.IGNORECASE),
    re.compile(r"\b-executionpolicy\s+bypass\b", re.IGNORECASE),
    re.compile(r"\b-w(?:indowstyle)?\s+hidden\b", re.IGNORECASE),
    re.compile(r"\b-enc(?:odedcommand)?\s+[A-Za-z0-9+/=]{12,}\b", re.IGNORECASE),
    re.compile(r"\bcertutil(?:\.exe)?\s+-urlcache\b", re.IGNORECASE),
    re.compile(r"\bcurl(?:\.exe)?\s+-(?:s|o|k)\b", re.IGNORECASE),
]


def detect_clickfix_lure(
    *,
    dom_text: str | None,
    page_title: str | None = None,
    javascript_data: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    """
    Detect the 'ClickFix' social-engineering campaign (ClearFake / Fake CAPTCHA).

    The lure displays a fake Cloudflare Turnstile or robot verification prompt
    instructing the victim to press Win+R, Ctrl+V, and Enter, running PowerShell payloads.
    """
    text = f"{page_title or ''} {dom_text or ''}".lower()

    # Signals for Run dialog instruction
    has_run_dialog = bool(
        re.search(r"\b(?:win\s*\+\s*r|windows\s*(?:key)?\s*\+\s*r|press\s+win\s*\+\s*r|press\s+windows\s*\+\s*r|hold\s+(?:the\s+)?windows\s+key|open\s+(?:the\s+)?run\s+dialog)\b", text)
    )

    # Signals for Paste / Execute instruction
    has_paste_exec = bool(
        re.search(r"\b(?:ctrl\s*\+\s*v|press\s+ctrl\s*\+\s*v|paste\s+(?:the\s+)?(?:command|code|script|text)|hit\s+enter|press\s+enter)\b", text)
    )

    # Signals for CAPTCHA / Bot verification pretext
    has_verification_pretext = bool(
        re.search(
            r"\b(?:verify\s+you\s+are\s+human|i\s*['’]?\s*m\s+not\s+a\s+robot|i\s+am\s+not\s+a\s+robot|"
            r"turnstile|cloudflare\s+verification|robot\s+verification|bot\s+detection|"
            r"human\s+verification|captcha\s+verification|verification\s+step|how\s+to\s+fix|"
            r"browser\s+verification|complete\s+the\s+verification)\b",
            text,
        )
    )

    # Check if script indicators flagged clipboard hijacking with shell tokens
    js_indicators = (javascript_data or {}).get("indicators", {})
    has_js_clip_hijack = js_indicators.get("has_clipboard_hijack", False)

    # Secondary signal: explicit powershell or terminal instructions in DOM text
    has_terminal_prompt = bool(
        re.search(r"\b(?:powershell|terminal|command\s+prompt|cmd\.exe)\b", text)
    )

    is_clickfix = False
    evidence_details: dict[str, Any] = {
        "lure_type": "clickfix_fake_captcha",
        "has_run_dialog_instructions": has_run_dialog,
        "has_paste_execute_instructions": has_paste_exec,
        "has_verification_pretext": has_verification_pretext,
        "has_terminal_prompt": has_terminal_prompt,
        "has_clipboard_hijack": has_js_clip_hijack,
    }

    # High-confidence: Run dialog + Paste instruction + (CAPTCHA pretext OR PowerShell prompt)
    if has_run_dialog and has_paste_exec and (has_verification_pretext or has_terminal_prompt or has_js_clip_hijack):
        is_clickfix = True
        evidence_details["confidence"] = "high"
        evidence_details["matched_pattern"] = "Win+R + Ctrl+V + Verification/Shell Pretext"

    # Alternative: Verification pretext + explicit PowerShell commands in DOM
    elif has_verification_pretext and any(p.search(text) for p in SUSPICIOUS_CMD_PATTERNS):
        is_clickfix = True
        evidence_details["confidence"] = "high"
        evidence_details["matched_pattern"] = "CAPTCHA Pretext with Embedded PowerShell Cradles"

    # Alternative: Run dialog + direct clipboard hijack signal from JS collector
    elif (has_run_dialog or has_paste_exec) and has_js_clip_hijack:
        is_clickfix = True
        evidence_details["confidence"] = "critical"
        evidence_details["matched_pattern"] = "Interactive Paste Instruction with Automated Shell Clipboard Hijack"

    if is_clickfix:
        return evidence_details

    return None


def detect_oauth_device_phishing(
    *,
    dom_text: str | None,
    page_title: str | None = None,
    final_url: str | None = None,
) -> dict[str, Any] | None:
    """
    Detect OAuth 2.0 Device Authorization Phishing (RFC 8628).

    Attacker creates a site prompting user to open a legitimate device login URL
    (e.g., microsoft.com/devicelogin) and enter a pre-generated attacker user code.
    """
    hostname = extract_hostname(final_url)
    # Legitimate vendor origins don't phish their own flow
    if is_domain_match(hostname, LEGIT_OAUTH_DEVICE_DOMAINS):
        return None

    text = f"{page_title or ''} {dom_text or ''}".lower()

    # Search for device login endpoint references
    device_login_match = re.search(
        r"\b(?:microsoft\.com/devicelogin|login\.microsoftonline\.com|google\.com/device|github\.com/login/device|device\s+login|devicelogin)\b",
        text,
    )

    if not device_login_match:
        return None

    # Search for user code prompt indicators
    code_prompt_match = re.search(
        r"\b(?:enter\s+(?:the\s+)?(?:code|user\s+code|device\s+code|pairing\s+code)|"
        r"code\s+to\s+authenticate|code\s+displayed|temporary\s+code|"
        r"sign\s+in\s+code|device\s+authorization)\b",
        text,
    )

    # Search for typical alphanumeric device code format (e.g., B7X8-K9M2 or ABCD1234)
    code_format_match = re.search(r"\b[A-Z0-9]{4}-[A-Z0-9]{4,5}\b|\b[A-Z0-9]{8,10}\b", dom_text or "")

    if code_prompt_match or code_format_match:
        return {
            "technique": "oauth_device_authorization_phishing",
            "impersonated_endpoint": device_login_match.group(0),
            "unauthorized_hosting_domain": hostname,
            "has_code_prompt": bool(code_prompt_match),
            "detected_code_sample": code_format_match.group(0) if code_format_match else None,
            "description": (
                f"Page hosted on untrusted domain '{hostname}' instructs victim to "
                f"authenticate at '{device_login_match.group(0)}' using a device pairing code."
            ),
        }

    return None


def detect_tech_support_scareware(
    *,
    dom_text: str | None,
    page_title: str | None = None,
    dialog_count: int = 0,
) -> dict[str, Any] | None:
    """
    Detect Tech Support Scam & Fake Security Lockout Lures (Scareware).

    The site impersonates Windows Defender, Microsoft Security, or Apple Support,
    falsely claiming computer infection or lockup and demanding a phone call.
    """
    text = f"{page_title or ''} {dom_text or ''}".lower()

    # Impersonated security authorities
    has_authority = bool(
        re.search(
            r"\b(?:windows\s+defender|microsoft\s+security(?:\s+center)?|apple\s+security\s+alert|"
            r"critical\s+security\s+alert|system\s+security\s+warning|firewall\s+alert|"
            r"microsoft\s+support\s+alert|windows\s+firewall\s+warning)\b",
            text,
        )
    )

    # Infection / lockout / destruction claims
    has_threat_claim = bool(
        re.search(
            r"\b(?:threat\s+detected|trojan\s+spyware|zeus\s+virus|computer\s+(?:has\s+been\s+)?locked|"
            r"access\s+to\s+this\s+pc\s+has\s+been\s+blocked|do\s+not\s+(?:restart|shut\s+down)|"
            r"hard\s+drive\s+(?:will\s+be\s+)?deleted|financial\s+data\s+(?:at\s+risk|compromised)|"
            r"ransomware\s+detected|error\s+code\s*:\s*#0x[0-9a-f]+)\b",
            text,
        )
    )

    # Demands to call toll-free phone number
    has_call_demand = bool(
        re.search(
            r"\b(?:call\s+(?:microsoft\s+support|apple\s+support|us\s+immediately|helpline|support)|"
            r"toll[\s-]?free\s*(?:helpline|number|support)?|contact\s+(?:certified\s+)?technician|"
            r"call\s+now\s+for\s+assistance|immediate\s+assistance\s+call)\b",
            text,
        )
    )

    # Phone number pattern (toll-free 1-800, 1-888, 1-877, 1-866, etc.)
    has_phone_number = bool(
        re.search(r"\b(?:\+?1[-\s]?)?(?:\(?8[0-9]{2}\)?[-\s]?[0-9]{3}[-\s]?[0-9]{4})\b", text)
    )

    if has_authority and (has_threat_claim or dialog_count > 0) and (has_call_demand or has_phone_number):
        matched_indicators = []
        if has_authority:
            matched_indicators.append("Security Authority Impersonation")
        if has_threat_claim:
            matched_indicators.append("Deceptive Lockout / Infection Claim")
        if has_call_demand or has_phone_number:
            matched_indicators.append("Fraudulent Support Helpline Call Lure")
        if dialog_count > 0:
            matched_indicators.append(f"{dialog_count} Blocking JavaScript Dialog(s)")

        return {
            "lure_type": "tech_support_scam_scareware",
            "matched_indicators": matched_indicators,
            "has_blocking_dialogs": dialog_count > 0,
            "has_phone_number": has_phone_number,
            "confidence": "high",
        }

    return None


def detect_fake_browser_update(
    *,
    dom_text: str | None,
    page_title: str | None = None,
    final_url: str | None = None,
    downloads_data: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    """
    Detect Fake Browser / Software Update Lures (SocGholish / FakeUpdates vector).

    Deceptive sites urging the user to update Google Chrome, Edge, or Firefox
    on unauthorized third-party domains.
    """
    hostname = extract_hostname(final_url)
    if is_domain_match(hostname, LEGIT_BROWSER_DOMAINS):
        return None

    text = f"{page_title or ''} {dom_text or ''}".lower()

    # Browser update lure phrases
    has_update_phrase = bool(
        re.search(
            r"\b(?:chrome\s+is\s+out\s+of\s+date|update\s+(?:google\s+)?chrome|"
            r"update\s+(?:microsoft\s+)?edge|update\s+your\s+browser|"
            r"browser\s+update\s+(?:is\s+)?recommended|critical\s+browser\s+update|"
            r"latest\s+version\s+of\s+chrome\s+is\s+required|"
            r"please\s+update\s+your\s+browser\s+to\s+view\s+this\s+content|"
            r"update\s+firefox|outdated\s+browser\s+detected)\b",
            text,
        )
    )

    if not has_update_phrase:
        return None

    # Check if download or executable file is initiated
    has_download_activity = False
    download_files = []
    if downloads_data and isinstance(downloads_data, dict):
        downloads = downloads_data.get("downloads", [])
        if downloads:
            has_download_activity = True
            download_files = [d.get("suggested_filename") or d.get("url") for d in downloads[:3]]

    # Secondary check: CTA buttons in DOM
    has_cta = bool(
        re.search(r"\b(?:download\s+update|update\s+now|install\s+update|update\s+chrome\s+now)\b", text)
    )

    if has_update_phrase:
        return {
            "lure_type": "fake_browser_update",
            "unauthorized_domain": hostname,
            "has_download_activity": has_download_activity,
            "download_files": download_files,
            "has_cta_button": has_cta,
            "confidence": "high" if (has_download_activity or has_cta) else "medium",
        }

    return None


def detect_clipboard_hijacking(
    *,
    javascript_data: dict[str, Any] | None,
    dom_text: str | None = None,
) -> dict[str, Any] | None:
    """
    Detect malicious clipboard hijacking payloads.

    Identifies when JavaScript or DOM routines silently copy shell commands,
    PowerShell execution cradles, or obfuscated payloads into the system clipboard.
    """
    if not javascript_data or not isinstance(javascript_data, dict):
        return None

    indicators = javascript_data.get("indicators", {})
    has_clip_flag = indicators.get("has_clipboard_hijack", False)
    snippets = indicators.get("suspicious_clipboard_snippets", [])

    # Also inspect dom_text for explicit clipboard copy routines with PowerShell payloads
    text = (dom_text or "").lower()
    dom_cradle_found = []
    if "clipboard" in text or "execcommand" in text:
        for pat in SUSPICIOUS_CMD_PATTERNS:
            m = pat.search(text)
            if m:
                dom_cradle_found.append(m.group(0))

    if has_clip_flag or dom_cradle_found:
        combined_payloads = list(set(snippets + dom_cradle_found))
        return {
            "technique": "malicious_clipboard_hijacking",
            "api_abused": "navigator.clipboard.writeText / execCommand('copy')",
            "detected_command_tokens": combined_payloads,
            "confidence": "high",
            "description": (
                "Page script injects command-line interpreter instructions into the system clipboard "
                f"targeting automated or lured terminal execution: {', '.join(combined_payloads[:4])}"
            ),
        }

    return None
