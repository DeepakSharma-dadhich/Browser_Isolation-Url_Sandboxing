# BrowseGuard
### Browser Isolation & Dynamic URL Threat Analysis Platform

[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Windows%20%7C%20Docker-blue.svg)](file:///d:/kali/CyberSecurity-Lab/Email-URL-Sandbox)
[![Database](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](file:///d:/kali/CyberSecurity-Lab/Email-URL-Sandbox/backend/src/db)
[![Backend](https://img.shields.io/badge/Node.js-20-339933.svg)](file:///d:/kali/CyberSecurity-Lab/Email-URL-Sandbox/backend)
[![Sandbox](https://img.shields.io/badge/Playwright-Chromium-2EAD33.svg)](file:///d:/kali/CyberSecurity-Lab/Email-URL-Sandbox/vm-agent)
[![Frontend](https://img.shields.io/badge/React-19%20%7C%20Vite-61DAFB.svg)](file:///d:/kali/CyberSecurity-Lab/Email-URL-Sandbox/frontend)
[![Extension](https://img.shields.io/badge/Extension-Manifest%20V3-yellow.svg)](file:///d:/kali/CyberSecurity-Lab/Email-URL-Sandbox/extension)

---

## 1. Product Overview

**BrowseGuard** is an enterprise-grade URL threat analysis and browser isolation platform built to protect organizations from credential harvesting phishing, malicious redirect chains, drive-by malware downloads, and Server-Side Request Forgery (SSRF) exploits.

Untrusted URLs submitted programmatically by **Email Security Gateways (SEGs)** or directly by employees through our **Browser Extension** are executed inside an ephemeral, strictly isolated headless Chromium sandbox. Detailed telemetry—including HTTP headers, DOM forms, cookies, SSL certificates, console anomalies, and screen captures—is evaluated by a deterministic threat engine and stored transactionally in PostgreSQL as a single source of truth.

---

## 2. Key Architecture Features

- **Isolated Headless Chromium Sandbox**: Executes untrusted code inside isolated worker processes without risking host compromise.
- **Fail-Closed SSRF Egress Firewall (`network_guard.py`)**: Intercepts all browser network routing. Blocks RFC 1918 private subnets, loopback, cloud instance metadata (`169.254.169.254`, Google Cloud metadata), carrier-grade NAT, and DNS rebinding tricks.
- **Relational PostgreSQL Data Tier**: 10 normalized tables managing organizations, API clients, analysis records, individual findings, redirect events, forensic reports, artifacts, and audit logs.
- **Enterprise REST API v1 (`/api/v1/analyses`)**: Scoped API keys, quota management, and SHA-256 idempotency key replays.
- **Asynchronous Webhook Engine**: Delivers cryptographically signed HMAC-SHA256 callback events to integrated email security gateways upon report completion.
- **Real-Time SOC Dashboard**: Interactive dark-mode dashboard with live polling feed, pipeline stepper, visual screenshot inspection, and raw forensic JSON inspector.
- **Manifest V3 Browser Extension**: Zero-trust in-page link interception with cyber threat warnings for webmail (Gmail, Outlook 365).

---

## 3. Directory Layout

```
Email-URL-Sandbox/
├── backend/                  # Control Plane API (Node.js, Express, PostgreSQL)
│   ├── src/
│   │   ├── config/           # Database pools & environment configuration
│   │   ├── controllers/      # REST API v1 & legacy dashboard endpoints
│   │   ├── db/               # PostgreSQL schema migrations (001_initial_schema.sql)
│   │   ├── middleware/       # API key authentication & scan quota enforcement
│   │   ├── routes/           # Express router definitions
│   │   └── services/         # Repository, VM agent integration, Webhooks
│   ├── tests/                # Automated email gateway simulation test suite
│   └── Dockerfile            # Production backend container image
│
├── vm-agent/                 # Isolated Execution Sandbox (Python 3.12, Playwright)
│   ├── collectors/           # Forensic telemetry collectors (headers, forms, JS, SSL)
│   ├── services/             # Network Guard SSRF firewall, Threat Analyzer, Job Manager
│   ├── shared/               # Shared volume for job queues, reports, and screenshots
│   ├── worker.py             # Standalone queue polling daemon
│   └── Dockerfile            # Playwright container image
│
├── frontend/                 # Web Analyst Dashboard (React 19, Vite)
│   ├── src/                  # App components, real-time live feed, threat dials
│   └── Dockerfile            # Nginx multi-stage SPA container
│
├── extension/                # Enterprise Browser Extension (Manifest V3)
│   ├── popup/                # Quick threat scanner & protection metrics
│   ├── options/              # Settings & connection tester
│   ├── background.js         # Service worker with caching & API verification
│   └── content.js            # In-page link intercept modal
│
├── docs/                     # Comprehensive Product & Engineering Documentation
│   ├── ARCHITECTURE.md
│   ├── EMAIL_INTEGRATION_GUIDE.md
│   ├── DEPLOYMENT_DOCKER.md
│   └── BROWSER_EXTENSION.md
│
└── docker-compose.yml        # Production multi-container orchestration
```

---

## 4. Quickstart

### Option A: Local Development Setup

#### 1. PostgreSQL Database
Ensure PostgreSQL is running locally and set `DATABASE_URL` in `backend/.env`:
```ini
DATABASE_URL=postgresql://postgres:YourPassword@localhost:5432/Browser_Isolation
```
Run migrations:
```bash
cd backend
node src/db/migrate.js
```

#### 2. Start the Isolated Worker Daemon
```bash
cd vm-agent
..\venv\Scripts\python.exe worker.py
```

#### 3. Start the Control Plane Backend
```bash
cd backend
npm run dev
# Server running at http://localhost:3000
```

#### 4. Start the Frontend Dashboard
```bash
cd frontend
npm run dev
# Dashboard running at http://localhost:5173
```

---

### Option B: Docker Production Topology
```bash
docker compose up -d --build
```
- Web Dashboard: `http://localhost:8080`
- Control Plane API: `http://localhost:3000`
- PostgreSQL: `localhost:5432`

---

## 5. Verification & Testing

Run the automated Email Security Gateway integration suite:
```bash
cd backend
node tests/email_gateway_simulation.js
```

Expected output:
```
======================================================================
  BROWSEGUARD ENTERPRISE EMAIL THREAT DETECTION INTEGRATION TEST
======================================================================
[Config] Target API: http://localhost:3000
[1/6] Verifying BrowseGuard Control Plane Health...
  ✓ System Status: healthy (DB: connected, Shared: OK)
[2/6] Starting Mock Email Gateway Webhook Listener on port 4040...
  ✓ Webhook listener active at http://127.0.0.1:4040/webhook
[3/6] Simulating Inbound Phishing Email with Cloud Metadata SSRF URL...
  ✓ Analysis Job Enqueued: session_...
[4/6] Verifying Idempotent Replay Prevention...
  ✓ Idempotency Replay confirmed: Returned original ID without duplicate scan.
[5/6] Awaiting Isolated Chromium Sandbox Execution & Polling Status...
  ✓ Sandbox Analysis Completed in 4311ms (Verdict: MALICIOUS, Score: 100)
  🛡️ [Gateway Policy Decision]: REWRITE_URL_AND_QUARANTINE
[6/6] Verifying Webhook Delivery & Cryptographic HMAC-SHA256 Signature...
  ✓ Received Webhook Event: 'analysis.completed'
  ✓ HMAC-SHA256 Cryptographic Signature: VALID (Verified via secret)
  ✓ Client Reference ID matched!
[Bonus] Verifying Full Canonical Forensic Report & Visual Screenshot...
  ✓ PostgreSQL Canonical Record Verified!
  ✓ Screenshot binary stream status: 200 (image/png)
======================================================================
  ALL ENTERPRISE EMAIL INTEGRATION TESTS PASSED SUCCESSFULLY! ✓
======================================================================
```

---

## 6. Documentation Index

- [Team Onboarding & Project Story Guide](docs/ONBOARDING_AND_ARCHITECTURE_STORY.md)
- [System Architecture & Threat Model](docs/ARCHITECTURE.md)
- [Email Security Gateway Integration Guide](docs/EMAIL_INTEGRATION_GUIDE.md)
- [Docker Production Deployment Guide](docs/DEPLOYMENT_DOCKER.md)
- [Browser Extension Installation & User Guide](docs/BROWSER_EXTENSION.md)

---

## 7. License

Proprietary enterprise software. Built for BrowseGuard Zero-Trust Browser Isolation & Dynamic Threat Analysis.