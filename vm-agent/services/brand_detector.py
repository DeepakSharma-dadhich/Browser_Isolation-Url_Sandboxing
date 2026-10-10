"""
Brand Impersonation, Phishing, and Domain Deception Detector for BrowseGuard.

Identifies:
1. Targeted Brand Impersonation (e.g. fake Microsoft, Google, PayPal, Apple login forms)
2. Domain Typosquatting and Punycode/Homoglyph lookalike attacks
3. Credential Harvesting on Free Cloud/SaaS hosting (Firebase, Vercel, Netlify, Cloudflare Pages)
4. Credential Exfiltration to Webhooks / Messaging APIs (Telegram, Discord)
5. High-Risk Phishing TLD Abuse
"""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlsplit


# Top high-value brands targeted in spear-phishing & credential harvesting
TARGETED_BRANDS: dict[str, dict[str, Any]] = {
    "Microsoft": {
        "keywords": ["microsoft", "office 365", "office365", "onedrive", "sharepoint", "outlook", "azure", "msft"],
        "legit_domains": [
            "microsoft.com", "live.com", "office.com", "office365.com",
            "sharepoint.com", "outlook.com", "microsoftonline.com", "azure.com",
            "windows.net", "skype.com", "msn.com", "bing.com"
        ]
    },
    "Google": {
        "keywords": ["google", "gmail", "google drive", "google workspace", "google docs"],
        "legit_domains": [
            "google.com", "gmail.com", "googleapis.com", "googleusercontent.com",
            "youtube.com", "google.co.uk", "google.co.in", "google.ca"
        ]
    },
    "Apple": {
        "keywords": ["apple", "icloud", "apple id", "itunes"],
        "legit_domains": ["apple.com", "icloud.com"]
    },
    "PayPal": {
        "keywords": ["paypal", "pypl"],
        "legit_domains": ["paypal.com", "paypal.me"]
    },
    "Amazon": {
        "keywords": ["amazon", "amazon prime", "aws"],
        "legit_domains": ["amazon.com", "amazonaws.com", "primevideo.com", "amazon.co.uk"]
    },
    "DocuSign": {
        "keywords": ["docusign"],
        "legit_domains": ["docusign.com", "docusign.net"]
    },
    "Adobe": {
        "keywords": ["adobe", "adobe sign", "acrobat"],
        "legit_domains": ["adobe.com", "adobesign.com"]
    },
    "Netflix": {
        "keywords": ["netflix"],
        "legit_domains": ["netflix.com"]
    },
    "Meta / Facebook": {
        "keywords": ["facebook", "instagram", "whatsapp", "meta business"],
        "legit_domains": ["facebook.com", "instagram.com", "whatsapp.com", "meta.com"]
    },
    "Chase Bank": {
        "keywords": ["chase", "jpmorgan"],
        "legit_domains": ["chase.com", "jpmorgan.com"]
    },
    "Bank of America": {
        "keywords": ["bank of america", "bofa"],
        "legit_domains": ["bankofamerica.com", "bofa.com"]
    },
    "Wells Fargo": {
        "keywords": ["wells fargo"],
        "legit_domains": ["wellsfargo.com"]
    },
    "DHL": {
        "keywords": ["dhl express", "dhl parcel"],
        "legit_domains": ["dhl.com", "dhl.de"]
    },
    "FedEx": {
        "keywords": ["fedex"],
        "legit_domains": ["fedex.com"]
    },
    "UPS": {
        "keywords": ["united parcel service", "ups tracking"],
        "legit_domains": ["ups.com"]
    },
    "USPS": {
        "keywords": ["usps", "postal service"],
        "legit_domains": ["usps.com"]
    },
    "Okta": {
        "keywords": ["okta"],
        "legit_domains": ["okta.com", "oktapreview.com"]
    }
}

# Free cloud / SaaS platforms abused for phishing kits
FREE_CLOUD_HOSTS = {
    "pages.dev",
    "web.app",
    "firebaseapp.com",
    "vercel.app",
    "netlify.app",
    "github.io",
    "gitlab.io",
    "my.canva.site",
    "glitch.me",
    "surge.sh",
    "render.com",
    "ipfs.dweb.link",
    "ipfs.cf-ipfs.com"
}

# Known exfiltration destinations used by phishing kits
MALICIOUS_EXFIL_HOSTS = {
    "api.telegram.org",
    "discord.com",
    "discordapp.com",
    "formspree.io",
    "web3forms.com",
    "formkeep.com",
    "webhook.site",
    "requestcatcher.com",
    "pipedream.net"
}

# High-abuse TLDs frequently registered by phishing threat actors
HIGH_ABUSE_TLDS = {
    ".top", ".xyz", ".buzz", ".surf", ".work", ".icu",
    ".cam", ".monster", ".fit", ".gq", ".cf", ".ga", ".ml", ".tk"
}


def extract_hostname(url: str | None) -> str | None:
    if not url or not isinstance(url, str):
        return None
    try:
        host = urlsplit(url).hostname
        return host.lower() if host else None
    except Exception:
        return None


def is_official_brand_domain(hostname: str | None, legit_domains: list[str]) -> bool:
    """
    Check if hostname is or belongs to one of the legitimate brand domains.
    E.g. 'login.microsoft.com' ends with 'microsoft.com'.
    """
    if not hostname:
        return False
    hostname = hostname.lower()
    for legit in legit_domains:
        if hostname == legit or hostname.endswith("." + legit):
            return True
    return False


def levenshtein_distance(s1: str, s2: str) -> int:
    """
    Calculate edit distance between two strings.
    """
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    previous_row = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def detect_brand_impersonation(
    *,
    page_title: str | None,
    final_url: str | None,
    forms_data: dict[str, Any] | None = None
) -> dict[str, Any] | None:
    """
    Detect if the page claims to be a brand without owning the official domain.
    """
    hostname = extract_hostname(final_url)
    if not hostname:
        return None

    title_lower = (page_title or "").lower()
    url_lower = (final_url or "").lower()
    has_password = False

    if forms_data and isinstance(forms_data, dict):
        has_password = (
            forms_data.get("has_password_field", False)
            or forms_data.get("has_login_form", False)
            or len(forms_data.get("orphan_password_inputs", [])) > 0
        )

    for brand_name, info in TARGETED_BRANDS.items():
        legit_domains = info["legit_domains"]
        keywords = info["keywords"]

        # Check if page claims to be this brand in title
        claimed_brand = False
        matching_keyword = None

        for kw in keywords:
            # Word boundary matching in title or URL path
            if re.search(r"\b" + re.escape(kw) + r"\b", title_lower) or kw in url_lower:
                claimed_brand = True
                matching_keyword = kw
                break

        if claimed_brand:
            if not is_official_brand_domain(hostname, legit_domains):
                return {
                    "brand": brand_name,
                    "keyword": matching_keyword,
                    "hostname": hostname,
                    "page_title": page_title,
                    "has_password_field": has_password,
                    "official_domains": legit_domains[:3]
                }

    return None


def detect_typosquatting(hostname: str | None) -> dict[str, Any] | None:
    """
    Detect typosquatting, Punycode homoglyphs, or lookalike brand domains.
    """
    if not hostname:
        return None

    hostname = hostname.lower()

    # 1. Punycode check (homoglyph attack e.g. xn--gogle-...)
    if "xn--" in hostname:
        return {
            "type": "punycode_homoglyph",
            "hostname": hostname,
            "description": "Internationalized Domain Name (Punycode) detected, commonly used in homoglyph spoofing."
        }

    # Extract Second-Level Domain (e.g., 'microsoft' from 'microsoft.com' or 'sub.microsoft.co.uk')
    parts = hostname.split(".")
    if len(parts) >= 2:
        sld = parts[-2]
    else:
        sld = parts[0]

    for brand_name, info in TARGETED_BRANDS.items():
        legit_domains = info["legit_domains"]
        if is_official_brand_domain(hostname, legit_domains):
            continue

        for legit in legit_domains:
            legit_sld = legit.split(".")[0]
            if len(legit_sld) < 4:
                continue

            # Exact substring with deceptive keywords (e.g. microsoft-login, secure-paypal)
            deceptive_patterns = [
                rf"{legit_sld}-.*",
                rf".*-{legit_sld}",
                rf"{legit_sld}login",
                rf"{legit_sld}verify",
                rf"{legit_sld}secure",
                rf"{legit_sld}update"
            ]
            for pattern in deceptive_patterns:
                if re.match(pattern, sld):
                    return {
                        "type": "deceptive_brand_keyword",
                        "brand": brand_name,
                        "impersonated_target": legit,
                        "hostname": hostname,
                        "description": f"Domain embeds brand '{brand_name}' with deceptive auth/security prefixes or suffixes."
                    }

            # Levenshtein distance check (e.g. micros0ft vs microsoft, paypa1 vs paypal)
            dist = levenshtein_distance(sld, legit_sld)
            if dist == 1 and len(sld) >= 5 and abs(len(sld) - len(legit_sld)) <= 1:
                return {
                    "type": "levenshtein_typosquatting",
                    "brand": brand_name,
                    "target_sld": legit_sld,
                    "hostname": hostname,
                    "distance": dist,
                    "description": f"Domain name closely resembles legitimate brand '{brand_name}' ({legit_sld}) with 1 character difference."
                }

    return None


def detect_cloud_hosted_phishing(
    final_url: str | None,
    forms_data: dict[str, Any] | None
) -> dict[str, Any] | None:
    """
    Detect login forms hosted on free cloud hosting platforms.
    """
    hostname = extract_hostname(final_url)
    if not hostname or not forms_data:
        return None

    is_free_cloud = False
    matched_host = None
    for cloud_host in FREE_CLOUD_HOSTS:
        if hostname == cloud_host or hostname.endswith("." + cloud_host):
            is_free_cloud = True
            matched_host = cloud_host
            break

    if is_free_cloud:
        has_password = (
            forms_data.get("has_password_field", False)
            or forms_data.get("has_login_form", False)
            or len(forms_data.get("orphan_password_inputs", [])) > 0
        )
        if has_password:
            return {
                "cloud_provider": matched_host,
                "hostname": hostname,
                "description": f"Credential harvesting form hosted on free/public cloud provider ({matched_host})."
            }

    return None


def detect_exfiltration_endpoints(forms_data: dict[str, Any] | None) -> dict[str, Any] | None:
    """
    Detect form submissions routing credentials to third-party webhooks or messaging APIs.
    """
    if not forms_data or not isinstance(forms_data, dict):
        return None

    forms = forms_data.get("forms", [])
    for form in forms:
        resolved_action = form.get("resolved_action", "")
        action_host = extract_hostname(resolved_action)
        if not action_host:
            continue

        for exfil_host in MALICIOUS_EXFIL_HOSTS:
            if action_host == exfil_host or action_host.endswith("." + exfil_host):
                return {
                    "exfil_target": action_host,
                    "action_url": resolved_action,
                    "form_index": form.get("index", 1),
                    "description": f"Form routes submitted data directly to external messaging/webhook platform ({action_host})."
                }

    return None


def detect_high_abuse_tld(final_url: str | None) -> dict[str, Any] | None:
    """
    Detect high-abuse phishing TLD combined with sensitive security keywords.
    """
    hostname = extract_hostname(final_url)
    if not hostname:
        return None

    matched_tld = None
    for tld in HIGH_ABUSE_TLDS:
        if hostname.endswith(tld):
            matched_tld = tld
            break

    if matched_tld:
        # Check if hostname contains sensitive lure keywords
        sensitive_keywords = ["login", "signin", "verify", "secure", "account", "banking", "update", "support", "auth"]
        found_kw = [kw for kw in sensitive_keywords if kw in hostname]
        if found_kw:
            return {
                "tld": matched_tld,
                "hostname": hostname,
                "keywords": found_kw,
                "description": f"Domain utilizes high-abuse TLD ({matched_tld}) containing security/auth keywords ({', '.join(found_kw)})."
            }

    return None
