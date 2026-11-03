#!/bin/bash
# ==============================================================================
# BrowseGuard — Oracle Cloud "Always Free" Automated 1-Click Deployment Script
# Targets: Ubuntu 22.04 LTS / 24.04 LTS (ARM64 Ampere or x86_64)
# ==============================================================================

set -e

echo "==========================================================="
echo "🛡️  BROWSEGUARD ZERO-TRUST SANDBOX — ORACLE CLOUD DEPLOYER"
echo "==========================================================="

# Check sudo / root
if [ "$EUID" -ne 0 ]; then
  echo "[-] Please run with sudo: sudo bash deploy-oracle.sh"
  exit 1
fi

echo "[1/6] Updating system packages..."
apt-get update -y
apt-get install -y curl git ufw iptables-persistent ca-certificates gnupg

# Oracle Cloud Ubuntu has default restrictive iptables rules that block non-port-22 incoming traffic.
echo "[2/6] Configuring OS-level Firewall (opening ports 8080, 80, 443, 3000, 22)..."
iptables -I INPUT 1 -p tcp --dport 8080 -j ACCEPT
iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT
iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT
iptables -I INPUT 1 -p tcp --dport 3000 -j ACCEPT
iptables -I INPUT 1 -p tcp --dport 22 -j ACCEPT
netfilter-persistent save || true

# Install Docker if not present
if ! command -v docker &> /dev/null; then
  echo "[3/6] Installing Docker Engine & Docker Compose..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  rm get-docker.sh
  systemctl enable --now docker
else
  echo "[3/6] Docker already installed."
fi

# Ensure docker-compose plugin or command is available
apt-get install -y docker-compose-plugin docker-compose || true

echo "[4/6] Setting up production environment variables..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f .env ]; then
  # Generate cryptographically secure secrets
  DB_PASS=$(openssl rand -hex 12)
  JWT_SEC=$(openssl rand -hex 24)
  INGEST_SEC=$(openssl rand -hex 16)
  WH_SEC=$(openssl rand -hex 16)
  
  cat << EOF > .env
# Auto-generated BrowseGuard Production Environment
POSTGRES_USER=browseguard_admin
POSTGRES_PASSWORD=${DB_PASS}
POSTGRES_DB=Browser_Isolation
JWT_SECRET=${JWT_SEC}
INGEST_SECRET=${INGEST_SEC}
BROWSEGUARD_WEBHOOK_SECRET=${WH_SEC}
ALLOWED_ORIGINS=*
NODE_ENV=production
EOF
  echo "[+] Generated new .env configuration file with secure credentials."
else
  echo "[+] Existing .env file found. Preserving credentials."
fi

# Fetch Public IP
PUBLIC_IP=$(curl -s https://api.ipify.org || hostname -I | awk '{print $1}')

echo "[5/6] Building and launching BrowseGuard container cluster..."
docker compose down || true
docker compose up -d --build

echo "[6/6] Verifying cluster health..."
sleep 5
docker compose ps

echo ""
echo "==========================================================="
echo "🎉 DEPLOYMENT COMPLETE! BROWSEGUARD IS NOW RUNNING!"
echo "==========================================================="
echo "Access the Platform via your Web Browser:"
echo "👉 http://${PUBLIC_IP}:8080"
echo ""
echo "API & WebSocket Gateway:"
echo "👉 http://${PUBLIC_IP}:3000"
echo ""
echo "NOTE for Oracle Cloud Console:"
echo "Make sure in your OCI Virtual Cloud Network (VCN) Ingress Rules,"
echo "you have opened Port 8080 and Port 3000 for 0.0.0.0/0."
echo "==========================================================="
