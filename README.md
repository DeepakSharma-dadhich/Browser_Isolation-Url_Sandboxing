# Email URL Sandbox Architecture

## 1. Project Objective

The Email URL Sandbox analyzes URLs inside an isolated Windows virtual machine.

The module accepts a URL, opens it through Chromium controlled by Playwright, collects browser evidence, generates a unified report, and returns analysis-ready data.

This module is designed as a standalone URL sandbox that can later be integrated into a larger email security system.

---

## 2. High-Level Architecture

```text
User
  |
  v
React Frontend
  |
  v
Node.js Host Server
  |
  v
FastAPI VM Agent
  |
  v
Playwright + Chromium
  |
  v
Evidence Collectors
  |
  v
Report Builder
  |
  v
Threat Analyzer
  |
  v
Decision Engine
3. Security Boundary

All URL execution and security analysis must occur inside the isolated VM.

The host system is responsible only for:

Receiving requests from the frontend
Forwarding URLs to the VM Agent
Returning results to the frontend

The host must not directly open or analyze submitted URLs.

4. Main Components
4.1 React Frontend

Responsibilities:

Accept URL input
Start URL analysis
Show loading status
Display session details
Display metadata
Display screenshot
Display risk score and verdict
4.2 Node.js Host Server

Responsibilities:

Expose the public API
Validate basic input
Forward the URL to the VM Agent
Return the VM response to the frontend
4.3 FastAPI VM Agent

Responsibilities:

Create an analysis session
Start browser analysis
Call the browser service
Return the final report
4.4 Browser Service

Responsibilities:

Launch Chromium
Register browser event listeners
Open the submitted URL
Call evidence collectors
Capture artifacts
Build the final report
Run threat analysis
Run the decision engine
4.5 Collectors

Each collector performs one task.

collectors/
├── metadata_collector.py
├── redirect_collector.py
├── network_collector.py
├── cookie_collector.py
├── console_collector.py
├── download_collector.py
├── html_collector.py
├── javascript_collector.py
├── forms_collector.py
├── headers_collector.py
└── certificate_collector.py

Collector responsibilities include:

Page metadata
Redirects
Network requests
Cookies
Browser console logs
Downloads
HTML source
JavaScript information
Form information
Response headers
Certificate information

Collectors return Python data and do not make security decisions.

4.6 Report Builder

Responsibilities:

Combine all evidence
Add session information
Save one master report.json
Maintain a consistent report structure
4.7 Threat Analyzer

Responsibilities:

Read collected evidence
Generate findings
Calculate a risk score

The Threat Analyzer does not control the browser.

4.8 Decision Engine

Responsibilities:

Convert the risk score into a verdict
Recommend an action

Example actions:

allow
warn
open_in_isolation
block
5. Request Flow
1. User enters a URL
2. React sends POST /api/analyze
3. Node.js forwards the URL to the VM Agent
4. VM Agent creates a session
5. Playwright launches Chromium inside the VM
6. Chromium opens the submitted URL
7. Collectors gather evidence
8. Screenshot and HTML artifacts are saved
9. Report Builder creates report.json
10. Threat Analyzer calculates risk
11. Decision Engine creates verdict and action
12. VM Agent returns the report
13. React displays the result
6. Session Storage

Each URL analysis receives a unique session ID.

Example:

reports/
└── 618edc5b/
    ├── report.json
    ├── screenshot.png
    └── page_source.html

Large artifacts are stored separately.

References to those artifacts are included in report.json.

7. Report Structure
{
  "session": {
    "id": "618edc5b",
    "status": "completed",
    "generated_at": "2026-07-10T10:00:00Z"
  },
  "metadata": {
    "submitted_url": "https://example.com",
    "final_url": "https://www.example.com/",
    "title": "Example",
    "page_status": "loaded",
    "page_load_time_ms": 850.4
  },
  "evidence": {
    "redirects": [],
    "network": [],
    "cookies": [],
    "console": [],
    "downloads": [],
    "forms": {},
    "javascript": {},
    "headers": {},
    "certificate": {}
  },
  "artifacts": {
    "screenshot": "reports/618edc5b/screenshot.png",
    "page_source": "reports/618edc5b/page_source.html"
  },
  "analysis": {
    "risk_score": 0,
    "verdict": "safe",
    "recommended_action": "allow",
    "findings": []
  }
}
8. Folder Structure
Email-URL-Sandbox/
├── backend/
├── frontend/
├── docs/
│   └── ARCHITECTURE.md
└── vm-agent/
    ├── collectors/
    ├── services/
    ├── reports/
    ├── agent_api.py
    ├── session_manager.py
    └── requirements.txt
9. Integration Contract

The URL Sandbox accepts:

{
  "url": "https://example.com"
}

The module returns:

{
  "success": true,
  "session_id": "618edc5b",
  "report": {
    "metadata": {},
    "evidence": {},
    "artifacts": {},
    "analysis": {}
  }
}

A larger email security system can consume:

report.analysis.risk_score
report.analysis.verdict
report.analysis.recommended_action
report.analysis.findings
10. Future Enhancements

Planned capabilities:

Google Safe Browsing integration
VirusTotal integration
Domain age and RDAP lookup
IP reputation
SSL certificate validation
Phishing form detection
JavaScript behavior analysis
Suspicious download scanning
Background job processing
Database storage
Multi-VM sandbox workers
Automatic VM reset after analysis