#!/bin/bash
set -e

echo "=========================================================="
echo "🛡️  BrowseGuard Cloud Engine Starting (Worker + Backend)"
echo "=========================================================="

mkdir -p /shared/input /shared/processing /shared/completed /shared/failed /shared/reports /shared/screenshots /shared/network

export PYTHONPATH="/app/vm-agent:/app:$PYTHONPATH"
export PYTHONUNBUFFERED=1

# Start Python Playwright Queue Worker in the background with unbuffered logging
echo "[BrowseGuard] Launching isolated VM queue worker..."
cd /app
python -u vm-agent/worker.py 2>&1 &
WORKER_PID=$!
echo "[BrowseGuard] Worker started with PID: $WORKER_PID"

# Start Node.js Host Backend in the foreground
echo "[BrowseGuard] Launching Node.js Host API on port ${PORT:-10000}..."
cd /app/backend
exec node src/app.js
