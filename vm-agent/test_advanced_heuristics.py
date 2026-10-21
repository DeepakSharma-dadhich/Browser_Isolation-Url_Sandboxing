"""
Unit and integration test suite for Advanced Phishing & Malware Heuristics.

Verifies:
1. CLICKFIX-001: ClickFix fake Turnstile / CAPTCHA Win+R paste lure detection & MITRE T1204.002
2. OAUTH-001: OAuth 2.0 Device code phishing & MITRE T1528
3. SCARED-001: Tech Support scareware lockout scam & MITRE T1204.001
4. UPDATE-001: Fake browser update lure (SocGholish) & MITRE T1189
5. CLIP-001: Malicious clipboard hijacking with PowerShell cradles & MITRE T1115
6. Negative Controls: Legitimate vendor sites (Microsoft, Google Chrome) don't trigger false positives
"""

import sys
import unittest
from pathlib import Path

# Add vm-agent root to sys.path
sys.path.insert(0, str(Path(__file__).parent))

from services.threat_analyzer import analyze_threats


class TestAdvancedHeuristics(unittest.TestCase):

    def test_01_clickfix_fake_captcha_detection(self):
        """CLICKFIX-001 should trigger on Win+R + Ctrl+V + CAPTCHA verification instructions."""
        evidence = {
            "metadata": {
                "page_title": "Cloudflare Human Verification Required",
                "final_url": "https://verify-cloudflare-gate.top/captcha",
                "dom_text": (
                    "Verify you are human to access the page.\n"
                    "Step 1: Press Windows + R to open the Run dialog.\n"
                    "Step 2: Press Ctrl + V to paste the verification string.\n"
                    "Step 3: Hit Enter to complete verification."
                )
            },
            "javascript": {
                "indicators": {
                    "has_clipboard_hijack": False
                }
            }
        }

        report = analyze_threats(evidence)
        finding_ids = [f["id"] for f in report["findings"]]

        self.assertIn("CLICKFIX-001", finding_ids)
        clickfix = next(f for f in report["findings"] if f["id"] == "CLICKFIX-001")
        self.assertEqual(clickfix["severity"], "critical")
        self.assertEqual(clickfix["score"], 50)
        self.assertEqual(clickfix["mitre_attack_id"], "T1204.002")
        self.assertTrue(report["risk_score"] >= 50)
        self.assertGreaterEqual(report["critical_finding_count"], 1)

    def test_02_oauth_device_code_phishing(self):
        """OAUTH-001 should trigger when an unauthorized domain instructs user to use microsoft.com/devicelogin."""
        evidence = {
            "metadata": {
                "page_title": "Secure SharePoint Document Access Portal",
                "final_url": "https://sharepoint-auth-portal.com/doc-viewer",
                "dom_text": (
                    "To open this encrypted invoice, sign in to your Microsoft Account.\n"
                    "1. Go to https://microsoft.com/devicelogin in a new tab.\n"
                    "2. Enter the device pairing code: B7X8-K9M2\n"
                    "3. Grant permissions to view the shared corporate spreadsheet."
                )
            }
        }

        report = analyze_threats(evidence)
        finding_ids = [f["id"] for f in report["findings"]]

        self.assertIn("OAUTH-001", finding_ids)
        oauth = next(f for f in report["findings"] if f["id"] == "OAUTH-001")
        self.assertEqual(oauth["severity"], "critical")
        self.assertEqual(oauth["score"], 45)
        self.assertEqual(oauth["mitre_attack_id"], "T1528")

    def test_03_oauth_legitimate_vendor_control(self):
        """OAUTH-001 should NOT trigger on legitimate Microsoft / Google domains."""
        evidence = {
            "metadata": {
                "page_title": "Microsoft Device Login",
                "final_url": "https://login.microsoftonline.com/common/oauth2/deviceauth",
                "dom_text": "Enter the code displayed on your device or app to sign in to microsoft.com/devicelogin."
            }
        }

        report = analyze_threats(evidence)
        finding_ids = [f["id"] for f in report["findings"]]

        self.assertNotIn("OAUTH-001", finding_ids)

    def test_04_tech_support_scareware_detection(self):
        """SCARED-001 should trigger on fake Defender lockout claiming infection with toll-free phone lure."""
        evidence = {
            "metadata": {
                "page_title": "Windows Defender Security Warning: System Compromised",
                "final_url": "https://system-security-alert-0x892.xyz/defender",
                "dom_text": (
                    "CRITICAL SECURITY ALERT: Threat Detected - Trojan Spyware!\n"
                    "Access to this PC has been blocked. Do not restart or shut down your PC.\n"
                    "Call Microsoft Support immediately: 1-800-555-0199 for immediate assistance.\n"
                    "Error code: #0x268D3."
                )
            },
            "dialogs": {
                "dialog_count": 2
            }
        }

        report = analyze_threats(evidence)
        finding_ids = [f["id"] for f in report["findings"]]

        self.assertIn("SCARED-001", finding_ids)
        scareware = next(f for f in report["findings"] if f["id"] == "SCARED-001")
        self.assertEqual(scareware["severity"], "high")
        self.assertEqual(scareware["score"], 40)
        self.assertEqual(scareware["mitre_attack_id"], "T1204.001")

    def test_05_fake_browser_update_detection(self):
        """UPDATE-001 should trigger on fake Chrome update lure on untrusted domain."""
        evidence = {
            "metadata": {
                "page_title": "Update Google Chrome to Continue",
                "final_url": "https://cdn-fast-browser-patch.org/update",
                "dom_text": (
                    "Your Chrome is out of date. Critical browser update recommended.\n"
                    "Please update your browser to view this content.\n"
                    "Download Update Now."
                )
            },
            "downloads": {
                "downloads": [{
                    "suggested_filename": "chrome_patch_v128.js",
                    "url": "https://cdn-fast-browser-patch.org/chrome_patch_v128.js"
                }]
            }
        }

        report = analyze_threats(evidence)
        finding_ids = [f["id"] for f in report["findings"]]

        self.assertIn("UPDATE-001", finding_ids)
        update_finding = next(f for f in report["findings"] if f["id"] == "UPDATE-001")
        self.assertEqual(update_finding["severity"], "high")
        self.assertEqual(update_finding["score"], 35)
        self.assertEqual(update_finding["mitre_attack_id"], "T1189")

    def test_06_fake_browser_update_legitimate_vendor_control(self):
        """UPDATE-001 should NOT trigger on google.com or official browser domains."""
        evidence = {
            "metadata": {
                "page_title": "Google Chrome - Download the Fast, Secure Browser",
                "final_url": "https://www.google.com/chrome/",
                "dom_text": "Download Chrome for Windows. Update to the latest version of Chrome."
            }
        }

        report = analyze_threats(evidence)
        finding_ids = [f["id"] for f in report["findings"]]

        self.assertNotIn("UPDATE-001", finding_ids)

    def test_07_clipboard_hijacking_detection(self):
        """CLIP-001 should trigger when JavaScript clipboard injection contains shell command cradles."""
        evidence = {
            "metadata": {
                "page_title": "Free Software License Generator",
                "final_url": "https://keygen-soft.net/license",
                "dom_text": "Click copy to obtain license key."
            },
            "javascript": {
                "indicators": {
                    "has_clipboard_hijack": True,
                    "suspicious_clipboard_snippets": ["powershell", "invoke-expression"]
                }
            }
        }

        report = analyze_threats(evidence)
        finding_ids = [f["id"] for f in report["findings"]]

        self.assertIn("CLIP-001", finding_ids)
        clip = next(f for f in report["findings"] if f["id"] == "CLIP-001")
        self.assertEqual(clip["severity"], "critical")
        self.assertEqual(clip["score"], 45)
        self.assertEqual(clip["mitre_attack_id"], "T1115")

    def test_08_multi_vector_campaign_composite_scoring(self):
        """Combination of ClickFix + Clipboard Hijacking should aggregate and cap properly at 100."""
        evidence = {
            "metadata": {
                "page_title": "Cloudflare Turnstile Verification",
                "final_url": "https://evasive-clickfix-payload.biz/gate",
                "dom_text": (
                    "I am not a robot. Human verification required.\n"
                    "Press Win+R, Ctrl+V, then Enter to confirm identity."
                )
            },
            "javascript": {
                "indicators": {
                    "has_clipboard_hijack": True,
                    "suspicious_clipboard_snippets": ["powershell", "cmd.exe"]
                }
            }
        }

        report = analyze_threats(evidence)
        finding_ids = [f["id"] for f in report["findings"]]

        self.assertIn("CLICKFIX-001", finding_ids)
        self.assertIn("CLIP-001", finding_ids)
        # 50 + 45 = 95
        self.assertGreaterEqual(report["risk_score"], 95)
        self.assertEqual(report["risk_level"], "critical")
        self.assertGreaterEqual(report["critical_finding_count"], 2)


if __name__ == "__main__":
    unittest.main()
