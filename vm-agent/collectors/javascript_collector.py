"""
JavaScript behavioral & DOM script evidence collector for BrowseGuard.

Analyzes inline and external scripts in the DOM, extracts third-party script
origins, and inspects code for obfuscation, dynamic evaluation, and anti-debugging tricks.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlsplit

from playwright.sync_api import Page


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


DOM_EXTRACT_SCRIPTS_SCRIPT = """
() => {
    const scripts = Array.from(document.querySelectorAll('script'));
    const externalSources = [];
    let inlineCount = 0;
    let externalCount = 0;

    let hasEval = false;
    let hasDocumentWrite = false;
    let hasUnescape = false;
    let hasFunctionConstructor = false;
    let hasAtob = false;
    let hasPackedCode = false;
    let hasAntiDebug = false;
    let hasCryptoMinerKeywords = false;
    let hasClipboardHijack = false;
    const suspiciousClipboardSnippets = [];
    let totalInlineLength = 0;

    const minerPatterns = ['coinhive.min.js', 'coinhive.anonymous', 'cryptoloot.token', 'crypto-loot.com', 'coin-hive.com', 'webminepool', 'monerominer', 'deepminer', 'authedmine'];
    const cmdKeywords = ['powershell', 'cmd.exe', 'cmd /c', 'mshta', 'curl', 'wget', 'certutil', 'invoke-webrequest', 'iwr', 'iex', 'invoke-expression', 'downloadstring', '-w hidden', '-enc '];

    for (const s of scripts) {
        const src = s.getAttribute('src');
        if (src) {
            externalCount++;
            try {
                const resolved = new URL(src, document.baseURI).href;
                externalSources.push(resolved);
            } catch {
                externalSources.push(src);
            }
        } else {
            inlineCount++;
            const content = s.textContent || '';
            totalInlineLength += content.length;

            const lower = content.toLowerCase();
            if (content.includes('eval(') || content.includes('window.eval')) hasEval = true;
            if (content.includes('document.write')) hasDocumentWrite = true;
            if (content.includes('unescape(')) hasUnescape = true;
            if (content.includes('new Function(') || content.includes('Function(')) hasFunctionConstructor = true;
            if (content.includes('atob(') || content.includes('btoa(')) hasAtob = true;
            if (content.includes('p,a,c,k,e,d') || content.includes('p,a,c,k,e,r')) hasPackedCode = true;
            if (content.includes('debugger') || content.includes('oncontextmenu = function') || content.includes('oncontextmenu = () =>')) hasAntiDebug = true;

            for (const pat of minerPatterns) {
                if (lower.includes(pat)) {
                    hasCryptoMinerKeywords = true;
                    break;
                }
            }

            // Detect malicious clipboard manipulation (ClickFix / paste cradle lures)
            if (lower.includes('clipboard.writetext') || lower.includes("execcommand('copy')") || lower.includes('execcommand("copy")')) {
                for (const cmd of cmdKeywords) {
                    if (lower.includes(cmd)) {
                        hasClipboardHijack = true;
                        if (!suspiciousClipboardSnippets.includes(cmd)) {
                            suspiciousClipboardSnippets.push(cmd);
                        }
                    }
                }
            }
        }
    }

    return {
        inline_count: inlineCount,
        external_count: externalCount,
        external_sources: externalSources.slice(0, 50),
        total_inline_length: totalInlineLength,
        indicators: {
            has_eval: hasEval,
            has_document_write: hasDocumentWrite,
            has_unescape: hasUnescape,
            has_function_constructor: hasFunctionConstructor,
            has_atob: hasAtob,
            has_packed_code: hasPackedCode,
            has_anti_debug: hasAntiDebug,
            has_crypto_miner_keywords: hasCryptoMinerKeywords,
            has_clipboard_hijack: hasClipboardHijack,
            suspicious_clipboard_snippets: suspiciousClipboardSnippets
        }
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


def collect_javascript(
    page: Page,
) -> dict[str, Any]:
    """
    Extract script inventory and heuristic behavioral signals from DOM.
    """
    page_url = page.url or ""
    page_hostname = extract_hostname(page_url)

    try:
        raw_res = page.evaluate(DOM_EXTRACT_SCRIPTS_SCRIPT)
    except Exception as exc:
        return {
            "collected_at": utc_now_iso(),
            "available": False,
            "inline_scripts": 0,
            "external_scripts": 0,
            "external_domains": [],
            "suspicious_signals": [],
            "error": str(exc),
        }

    external_sources = raw_res.get("external_sources", [])
    indicators = raw_res.get("indicators", {})

    external_domains = set()
    third_party_domains = set()

    for src in external_sources:
        h = extract_hostname(src)
        if h:
            external_domains.add(h)
            if page_hostname and not (
                h == page_hostname
                or h.endswith("." + page_hostname)
                or page_hostname.endswith("." + h)
            ):
                third_party_domains.add(h)

    suspicious_signals = []
    if indicators.get("has_packed_code"):
        suspicious_signals.append("Packed/obfuscated JavaScript pattern detected.")
    if indicators.get("has_eval"):
        suspicious_signals.append("Dynamic eval() code execution detected.")
    if indicators.get("has_function_constructor"):
        suspicious_signals.append("Dynamic Function() constructor execution detected.")
    if indicators.get("has_unescape"):
        suspicious_signals.append("Legacy unescape() string decoder detected (common in exploit kits).")
    if indicators.get("has_crypto_miner_keywords"):
        suspicious_signals.append("Potential in-browser cryptocurrency miner keywords observed.")
    if indicators.get("has_anti_debug"):
        suspicious_signals.append("Anti-debugging or context-menu suppression pattern observed.")
    if indicators.get("has_clipboard_hijack"):
        suspicious_signals.append("Malicious clipboard hijacking payload detected (command shell / download cradle copied to clipboard).")

    return {
        "collected_at": utc_now_iso(),
        "available": True,
        "inline_script_count": raw_res.get("inline_count", 0),
        "external_script_count": raw_res.get("external_count", 0),
        "total_inline_bytes": raw_res.get("total_inline_length", 0),
        "external_domain_count": len(external_domains),
        "external_domains": sorted(list(external_domains)),
        "third_party_domain_count": len(third_party_domains),
        "third_party_domains": sorted(list(third_party_domains)),
        "indicators": indicators,
        "suspicious_signals": suspicious_signals,
    }