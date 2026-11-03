FROM mcr.microsoft.com/playwright/python:v1.50.0-noble

WORKDIR /app

# Prevent interactive prompts during apt installs
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# 1. Install Node.js 20 and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gnupg \
    build-essential \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 2. Install Python dependencies
COPY vm-agent/requirements.txt ./vm-agent/
RUN pip install --no-cache-dir -r vm-agent/requirements.txt

# 3. Install Node.js dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# 4. Copy source code
COPY backend/ ./backend/
COPY vm-agent/ ./vm-agent/
COPY start_render.sh ./start_render.sh
RUN chmod +x ./start_render.sh

# 5. Shared workspace volume
RUN mkdir -p /shared && chmod -R 777 /shared

# Environment Variables
ENV PORT=10000
ENV NODE_ENV=production
ENV SHARED_ROOT=/shared
ENV SANDBOX_SHARED_ROOT=/shared
ENV BACKEND_HOST=127.0.0.1:10000
ENV INGEST_SECRET=bg_internal_worker_ingest_secret_2026
ENV JWT_SECRET=browseguard_secret_jwt_key_2026_enterprise_99
ENV SANDBOX_BROWSER_CHANNEL=""

EXPOSE 10000

CMD ["/app/start_render.sh"]
