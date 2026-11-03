# 🚀 BrowseGuard 100% Free Production Deployment Guide
## Stack: Neon.tech (PostgreSQL) + Render.com (Backend & Worker) + Vercel (Frontend UI)

This guide takes **under 10 minutes** to deploy the complete BrowseGuard Threat Isolation & URL Sandboxing platform for **₹0 (Zero Cost, No Credit Card Required)**.

---

## 📋 Architecture Overview

```
                      [ User Browser / Analyst ]
                                  │
                                  ▼
               ┌─────────────────────────────────────┐
               │         Vercel (Frontend)           │
               │   https://browseguard.vercel.app    │
               │   (React SPA, Vite, Any.Run UI)     │
               └──────────────────┬──────────────────┘
                                  │ HTTP / WSS
                                  ▼
               ┌─────────────────────────────────────┐
               │       Render.com (Web Service)      │
               │ https://browseguard.onrender.com    │
               │                                     │
               │  ┌───────────────────────────────┐  │
               │  │ Node.js Host Backend (port 10k│  │
               │  │ REST APIs + LiveStreamHub WSS │  │
               │  └───────────────┬───────────────┘  │
               │                  │ Local Shared Disk│
               │  ┌───────────────▼───────────────┐  │
               │  │ Python Playwright VM Agent    │  │
               │  │ Chromium Sandbox & MITRE ATT&CK│ │
               │  └───────────────────────────────┘  │
               └──────────────────┬──────────────────┘
                                  │ Database Query
                                  ▼
               ┌─────────────────────────────────────┐
               │        Neon.tech (PostgreSQL)       │
               │  Serverless Postgres (0.5GB Free)   │
               │  Users, Quotas, FastPass, IOCs      │
               └─────────────────────────────────────┘
```

---

## 🟢 Part 1: Create Free PostgreSQL on Neon.tech (2 Minutes)

1. Go to **[https://neon.tech](https://neon.tech)** and click **Sign Up** (use your GitHub account).
2. Click **Create a project**:
   - **Project name:** `browseguard-db`
   - **Postgres version:** `16`
   - **Region:** Choose closest region (e.g. `AWS Asia Pacific (Singapore)` or `AWS US East`).
3. Once created, Neon displays your **Connection Details**:
   - Select **Connection string**
   - Click the copy button 📋.
   - It looks like:
     ```
     postgresql://neondb_owner:npg_AbCdEf123@ep-fancy-pool-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
     ```
4. Save this connection string; you will paste it into Render in Part 2.

> [!NOTE]
> BrowseGuard has auto-migrations built in. The moment the backend boots and connects to Neon, it automatically creates all required tables (`users`, `organizations`, `analyses`, `trusted_vendors`, `subscriptions`, etc.).

---

## 🔵 Part 2: Deploy Backend & Sandbox Worker on Render.com (4 Minutes)

1. Go to **[https://render.com](https://render.com)** and sign up / log in with your GitHub account.
2. Click **New +** (top right) ➔ select **Web Service**.
3. Under **Connect a repository**, select your repo:
   - `DeepakSharma-dadhich/Browser_Isolation-Url_Sandboxing`
4. Configure the Web Service:
   - **Name:** `browseguard-backend` (or your chosen name)
   - **Region:** Choose the region closest to your Neon database (e.g. Singapore or Oregon)
   - **Branch:** `Deepak`
   - **Language / Runtime:** Select **`Docker`**
   - **Dockerfile Path:** `render.Dockerfile`
   - **Instance Type:** Select **`Free`** (0.5 CPU, 512 MB RAM)
5. Scroll down to **Environment Variables** and add the following keys:

| Key | Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://neondb_owner:***@ep-***.neon.tech/neondb?sslmode=require` | (Your connection string from Part 1) |
| `NODE_ENV` | `production` | Enables production optimizations |
| `JWT_SECRET` | `browseguard_super_secure_jwt_2026_enterprise_99` | Secret for user sessions |
| `INGEST_SECRET` | `bg_internal_worker_ingest_secret_2026` | Secret for internal frame streamer |
| `ALLOWED_ORIGINS` | `*` | Allows cross-origin requests from Vercel |
| `PORT` | `10000` | Render default port |

6. Click **Deploy Web Service** at the bottom.
7. Render will build the container from `render.Dockerfile` (installs Node.js, Python, Playwright Chromium, and starts both worker and backend).
8. Once the log says `BrowseGuard Host Backend running with RBI Streaming`, copy your public Render URL:
   - Example: `https://browseguard-backend.onrender.com`

---

## 🟣 Part 3: Deploy Frontend UI on Vercel (2 Minutes)

1. Go to **[https://vercel.com](https://vercel.com)** and log in with GitHub.
2. Click **Add New...** ➔ **Project**.
3. Import your repository:
   - `DeepakSharma-dadhich/Browser_Isolation-Url_Sandboxing`
4. Configure the project settings:
   - **Project Name:** `browseguard`
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click **Edit** and select the **`frontend`** folder ➔ click **Continue**.
5. Open **Environment Variables** and add:

| Key | Value |
| :--- | :--- |
| `VITE_BACKEND_URL` | `https://browseguard-backend.onrender.com` (Your Render URL from Part 2) |
| `VITE_BACKEND_WS_URL` | `browseguard-backend.onrender.com` (Host without `https://`) |

6. Click **Deploy**.
7. In ~30 seconds, Vercel will complete the build and give you your live URL:
   - Example: `https://browseguard.vercel.app`

---

## 🎉 You're Live!

Open your Vercel URL in your browser:
1. **Landing Page:** See the clean top navigation, INR pricing (`₹0`, `₹3,999`, `₹15,999`), and click "Get started".
2. **Interactive Detonation:** Enter any suspicious URL or click a pre-built phishing simulation.
3. **Live Streaming:** Watch the isolated Chromium browser detonate the page in real-time.
4. **Forensic Report:** View the MITRE ATT&CK matrix, IOC exports, HAR traffic stream, and Brand Impersonation alerts!
