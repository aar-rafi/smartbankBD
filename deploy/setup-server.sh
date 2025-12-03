#!/bin/bash
# ============================================================
# ChequeMate Server Setup Script
# Run this on a fresh Ubuntu 22.04 VM
# Usage: sudo ./setup-server.sh
# ============================================================

set -e

echo "============================================"
echo "  ChequeMate Server Setup"
echo "============================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root: sudo ./setup-server.sh"
    exit 1
fi

DEPLOY_USER=${SUDO_USER:-ubuntu}
APP_DIR="/home/$DEPLOY_USER/chequemate-ai"

echo ""
echo "[1/8] Updating system packages..."
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq

echo ""
echo "[2/8] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
apt-get install -y nodejs -qq

echo ""
echo "[3/8] Installing PostgreSQL..."
apt-get install -y postgresql postgresql-contrib -qq
systemctl start postgresql
systemctl enable postgresql

echo ""
echo "[4/8] Installing Python & dependencies..."
apt-get install -y python3 python3-pip python3-venv python3-dev build-essential -qq

echo ""
echo "[5/8] Installing Nginx..."
apt-get install -y nginx certbot python3-certbot-nginx -qq

echo ""
echo "[6/8] Installing PM2..."
npm install -g pm2 --silent

echo ""
echo "[7/8] Setting up database..."

# Create database and user
sudo -u postgres psql -c "DROP DATABASE IF EXISTS chequemate;" 2>/dev/null || true
sudo -u postgres psql -c "DROP USER IF EXISTS chequemate_user;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE USER chequemate_user WITH PASSWORD 'chequemate_pass';"
sudo -u postgres psql -c "CREATE DATABASE chequemate OWNER chequemate_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE chequemate TO chequemate_user;"

# Import backup
if [ -f "$APP_DIR/chequemate_backup.sql" ]; then
    echo "Importing database backup..."
    # Remove the \restrict line if it exists (pg_dump artifact)
    sed -i '/^\\restrict/d' "$APP_DIR/chequemate_backup.sql"
    sudo -u postgres psql -d chequemate -f "$APP_DIR/chequemate_backup.sql" > /dev/null 2>&1 || {
        echo "First import attempt had issues, retrying..."
        sudo -u postgres psql -d chequemate -f "$APP_DIR/chequemate_backup.sql" 2>&1 | tail -5
    }
    sudo -u postgres psql -d chequemate -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO chequemate_user;"
    sudo -u postgres psql -d chequemate -c "GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO chequemate_user;"
    echo "Database imported successfully!"
else
    echo "Warning: chequemate_backup.sql not found!"
fi

# Configure PostgreSQL for local connections
PG_HBA=$(find /etc/postgresql -name pg_hba.conf | head -1)
if [ -n "$PG_HBA" ]; then
    grep -q "chequemate_user" "$PG_HBA" || echo "host    chequemate      chequemate_user    127.0.0.1/32    md5" >> "$PG_HBA"
fi
systemctl restart postgresql

echo ""
echo "[8/8] Opening firewall ports..."
# For ufw (if enabled)
ufw allow 80/tcp 2>/dev/null || true
ufw allow 443/tcp 2>/dev/null || true
ufw allow 5000/tcp 2>/dev/null || true
ufw allow 5001/tcp 2>/dev/null || true
ufw allow 3001/tcp 2>/dev/null || true

# Fix permissions
chown -R $DEPLOY_USER:$DEPLOY_USER "$APP_DIR"

echo ""
echo "============================================"
echo "  Server setup complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. cd $APP_DIR"
echo "  2. chmod +x start-prod.sh"
echo "  3. ./start-prod.sh"
echo ""
