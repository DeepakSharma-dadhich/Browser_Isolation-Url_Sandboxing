"use strict";

const axios = require("axios");

const BASE_URL = "http://localhost:3000";

// Sample malicious RFC822 email payload (Microsoft 365 Password Expiry with anchor spoofing & quishing)
const SAMPLE_M365_PHISH_EML = `From: "Microsoft Security Team" <security-alert@micros0ft-365-verify.com>
To: victim-analyst@enterprise-corp.local
Subject: [CRITICAL ACTION REQUIRED] Microsoft 365 Password Expiring Today
Date: Mon, 12 Oct 2026 09:14:22 +0000
Message-ID: <20261012.891244@micros0ft-365-verify.com>
Return-Path: <bounce-daemon@evil-spammer-bulletproof.ru>
Authentication-Results: spf=fail (sender IP 198.51.100.77); dkim=fail; dmarc=fail action=quarantine
Content-Type: multipart/mixed; boundary="----=_Part_8921_1982736"

------=_Part_8921_1982736
Content-Type: text/html; charset="UTF-8"
Content-Transfer-Encoding: quoted-printable

<!DOCTYPE html>
<html>
<body style=3D"font-family: Arial, sans-serif;">
  <div style=3D"background: #0078d4; color: #ffffff; padding: 15px;">
    <h2>Microsoft Security Alert</h2>
  </div>
  <p>Dear Employee,</p>
  <p>Your corporate Microsoft 365 password expires in <strong>3 hours</strong>. Failure to confirm your identity will cause immediate account suspension.</p>
  <p>Please click below to retain your current password:</p>
  <p>
    <a href=3D"https://attacker-credential-harvester.xyz/login/m365?session=3D99812">https://login.microsoftonline.com/common/oauth2/authorize</a>
  </p>
  <p>If you are on an unmanaged mobile device, scan the authenticator app QR code below to verify your corporate token.</p>
  <p>Secondary authentication link: https://192.168.1.55/backup-auth</p>
</body>
</html>
------=_Part_8921_1982736
Content-Type: application/octet-stream; name="Urgent_Invoice_Doc.pdf.exe"
Content-Disposition: attachment; filename="Urgent_Invoice_Doc.pdf.exe"

TVqQAAMAAAAEAAAA//8AALgAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAA==
------=_Part_8921_1982736--
`;

async function testEmlGatewayForensics() {
  console.log("\n=======================================================");
  console.log("📧  BROWSEGUARD RFC822 / .EML FORENSICS & DETONATION TEST");
  console.log("=======================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  try {
    // TEST 1: Parse Raw .EML stream
    console.log("--- TEST 1: POST /api/v1/email-gateway/parse-eml ---");
    const res1 = await axios.post(`${BASE_URL}/api/v1/email-gateway/parse-eml`, {
      raw_eml: SAMPLE_M365_PHISH_EML
    });

    assert(res1.status === 200, "Parse EML endpoint returned HTTP 200");
    const data = res1.data;

    // Header validations
    assert(data.email_summary.subject.includes("Microsoft 365 Password Expiring"), "Subject correctly decoded");
    assert(data.email_summary.from.address === "security-alert@micros0ft-365-verify.com", "Sender address extracted correctly");
    assert(data.email_summary.auth_results.spf === "FAIL", "SPF failure detected (spoofed domain)");
    assert(data.email_summary.auth_results.dmarc === "FAIL", "DMARC failure detected");

    // Indicator validations
    const signals = data.email_summary.phishing_indicators.map((i) => i.signal);
    assert(signals.includes("EMAIL_AUTH_FAILURE"), "Phishing signal EMAIL_AUTH_FAILURE detected");
    assert(signals.includes("DECEPTIVE_HYPERLINK"), "Anchor mismatch DECEPTIVE_HYPERLINK detected");
    assert(signals.includes("EXECUTABLE_ATTACHMENT"), "Dangerous attachment EXECUTABLE_ATTACHMENT detected (.pdf.exe)");
    assert(signals.includes("QUISHING_TACTIC_DETECTED"), "Quishing tactic QUISHING_TACTIC_DETECTED detected");

    // Verdict and scoring
    assert(data.email_summary.threat_score >= 80, `Threat score reflects high severity (${data.email_summary.threat_score}/100)`);
    assert(data.email_summary.verdict === "MALICIOUS", `Email verdict is MALICIOUS (${data.email_summary.verdict})`);

    // Extracted links
    assert(data.extracted_links.length >= 2, `Extracted ${data.extracted_links.length} distinct URLs`);
    const deceptiveLink = data.extracted_links.find((l) => l.is_mismatched);
    assert(Boolean(deceptiveLink), "Deceptive link with mismatched anchor identified");

    // TEST 2: Detonate Extracted Links into Sandbox Queue
    console.log("\n--- TEST 2: POST /api/v1/email-gateway/detonate-links ---");
    const res2 = await axios.post(
      `${BASE_URL}/api/v1/email-gateway/detonate-links`,
      {
        links: data.extracted_links.slice(0, 1),
        email_metadata: data.email_summary
      },
      {
        headers: {
          "X-API-Key": "bg_live_email_gateway_default"
        }
      }
    );

    assert(res2.status === 200, "Detonate links endpoint returned HTTP 200");
    assert(Array.isArray(res2.data.analyses) && res2.data.analyses.length === 1, "Enqueued extracted link into VM sandbox queue");
    assert(res2.data.analyses[0].session_id !== undefined, `Received active Session ID: ${res2.data.analyses[0].session_id}`);
    assert(res2.data.analyses[0].isolation_url !== undefined, "Generated instant Isolation URL for zero-trust RBI streaming");

  } catch (err) {
    console.error("Test execution failed:", err.response?.data || err.message);
  }

  console.log("\n=======================================================");
  console.log(`RESULTS: ${passed}/${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("=======================================================\n");

  if (passed === total) {
    console.log("🎉 ALL RFC822 / .EML FORENSICS TESTS PASSED SUCCESSFULLY!\n");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

testEmlGatewayForensics();
