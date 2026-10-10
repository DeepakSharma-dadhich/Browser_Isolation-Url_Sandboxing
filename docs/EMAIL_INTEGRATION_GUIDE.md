# BrowseGuard Email Security Gateway Integration Guide

## 1. Overview

This guide explains how to integrate BrowseGuard with enterprise Email Security Gateways (SEGs) such as **Proofpoint, Mimecast, Microsoft Defender for Office 365**, or custom Postfix/Milter mail pipelines.

When an inbound email arrives containing untrusted links, the SEG calls BrowseGuard's REST API v1 (`POST /api/v1/analyses`) to inspect the link in an isolated browser sandbox before deciding whether to deliver the message, rewrite the link, or quarantine it.

---

## 2. Authentication

All requests to BrowseGuard API v1 must provide a valid API key via either:
- Header: `X-API-Key: <your_api_key>`
- Header: `Authorization: Bearer <your_api_key>`

Default development API key: `bg_live_email_gateway_default`

---

## 3. API Endpoints

### 3.1 Enqueue URL Analysis
`POST /api/v1/analyses`

#### Request Headers:
```http
Content-Type: application/json
X-API-Key: bg_live_email_gateway_default
```

#### Request Body:
```json
{
  "url": "https://suspicious-invoice-download.com/login",
  "source": "EMAIL_SECURITY",
  "idempotency_key": "c3ab8ff13720e8ad9047dd39466b3c8974e592c2fa383d4a3960714caef0c4f2",
  "callback_url": "https://email-gateway.corp.com/api/webhooks/browseguard",
  "client_reference_id": "msg_20261010_498218",
  "scan_options": {
    "email_metadata": {
      "sender": "billing-support@spoofed-bank.com",
      "recipient": "finance@company.com",
      "subject": "Action Required: Overdue Invoice Payment"
    }
  }
}
```

#### Response (202 Accepted):
```json
{
  "success": true,
  "message": "Analysis request queued successfully.",
  "data": {
    "analysis_id": "session_20261010051431_88472bab",
    "url": "https://suspicious-invoice-download.com/login",
    "status": "QUEUED",
    "source_channel": "EMAIL_SECURITY",
    "submitted_at": "2026-10-10T05:14:31.000Z",
    "links": {
      "self": "/api/v1/analyses/session_20261010051431_88472bab",
      "status": "/api/v1/analyses/session_20261010051431_88472bab/status",
      "report": "/api/v1/analyses/session_20261010051431_88472bab",
      "screenshot": "/api/v1/analyses/session_20261010051431_88472bab/screenshot"
    }
  }
}
```

---

### 3.2 Poll Analysis Status (Synchronous / Polling Mode)
`GET /api/v1/analyses/:id/status`

#### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "analysis_id": "session_20261010051431_88472bab",
    "status": "COMPLETED",
    "verdict": "MALICIOUS",
    "recommended_action": "BLOCK",
    "allow_user_access": false,
    "risk_score": 100,
    "risk_level": "critical",
    "finding_count": 2,
    "duration_ms": 4311,
    "report_ready": true,
    "submitted_at": "2026-10-10T05:14:31.000Z",
    "completed_at": "2026-10-10T05:14:38.000Z"
  }
}
```

---

### 3.3 Retrieve Full Forensic Report
`GET /api/v1/analyses/:id`

Returns complete JSON with evidence summary, redirect chains, SSL certificates, cookies, forms, and uncaught JavaScript logs.

### 3.4 Retrieve Visual Screen Capture
`GET /api/v1/analyses/:id/screenshot`

Streams binary image (`Content-Type: image/png`).

---

## 4. Webhook Notification & Signature Verification

BrowseGuard delivers asynchronous HMAC-SHA256 signed callbacks when `callback_url` is provided.

### Headers:
- `X-BrowseGuard-Event: analysis.completed`
- `X-BrowseGuard-Signature: sha256=<hex_hmac_signature>`

### Verification (Node.js Example):
```javascript
const crypto = require("crypto");

function verifyBrowseGuardWebhook(rawPayloadBuffer, signatureHeader, secret) {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const expected = signatureHeader.slice(7);
  const actual = crypto
    .createHmac("sha256", secret)
    .update(rawPayloadBuffer)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}
```

### Verification (Python Example):
```python
import hmac
import hashlib

def verify_webhook(raw_payload_bytes: bytes, signature_header: str, secret: str) -> bool:
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = signature_header.split("=", 1)[1]
    actual = hmac.new(secret.encode(), raw_payload_bytes, hashlib.sha256).hexdigest()
    return hmac.compare_digest(actual, expected)
```

---

## 5. Gateway Policy Enforcement Recommendation

| BrowseGuard Verdict | Risk Score | Recommended Gateway Policy Action |
|---|---|---|
| `SAFE` | 0 – 39 | **ALLOW_DELIVERY** (Deliver email unmodified) |
| `SUSPICIOUS` | 40 – 69 | **REWRITE_URL** (Route destination through BrowseGuard sandbox) |
| `HIGH_RISK` | 70 – 89 | **QUARANTINE_OR_STRIP** (Strip link from message body or flag warning banner) |
| `MALICIOUS` | 90 – 100 | **QUARANTINE_EMAIL** (Block delivery immediately, notify SOC team) |
