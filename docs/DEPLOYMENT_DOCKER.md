# BrowseGuard Production Deployment Guide (Docker & Container Topology)

## 1. Prerequisites

- Docker Engine 24.0+ and Docker Compose v2.20+
- Host with at least 4 GB RAM and 2 vCPUs recommended for Playwright Chromium headless sandboxing
- Network egress allowed on standard HTTP/HTTPS ports (80, 443)

---

## 2. Environment Configuration

Create a `.env` file in the project root or configure orchestrator environment variables:

```ini
# PostgreSQL Credentials
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YourStrongDatabasePassword123!
POSTGRES_DB=Browser_Isolation

# BrowseGuard Webhook Secret
BROWSEGUARD_WEBHOOK_SECRET=bg_wh_production_secret_key_change_me
```

---

## 3. Starting the Production Cluster

Run the following command from the repository root:

```bash
docker compose up -d --build
```

### Services Started:
1. `browseguard-postgres`: PostgreSQL 16 database holding 10 normalized tables.
2. `browseguard-backend`: Node.js Control Plane API on port 3000.
3. `browseguard-worker`: Isolated Python 3.12 Playwright sandbox worker with Network Guard egress firewall.
4. `browseguard-frontend`: React SPA served via Nginx reverse proxy on port 8080.

---

## 4. Verification & Health Monitoring

Check running container status:
```bash
docker compose ps
```

Verify backend health and database connectivity:
```bash
curl http://localhost:3000/api/health
```

Expected output:
```json
{
  "status": "healthy",
  "service": "browseguard-backend",
  "version": "2.1.0",
  "database": {
    "status": "connected",
    "details": {
      "connected": true,
      "database": "Browser_Isolation"
    }
  }
}
```

Access the Web Dashboard in your browser:
```
http://localhost:8080
```

---

## 5. Running the Automated Integration Suite

Execute the mock email gateway simulation test:
```bash
docker compose exec backend node tests/email_gateway_simulation.js
```
