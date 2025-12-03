#!/bin/bash
# ============================================================
# ChequeMate Production Startup Script
# Starts all services using PM2 for process management
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================"
echo "  ChequeMate Production Startup"
echo "============================================"

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local..."
    cat > .env.local << EOF
GEMINI_API_KEY=AIzaSyAFB0Xarss5lJ5C_3Sswnta9Tg5p4CISDY

# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chequemate
DB_USER=chequemate_user
DB_PASSWORD=chequemate_pass
DB_SSL=false

# Backend Server Configuration
SERVER_PORT=3001
FRONTEND_URL=http://localhost:5000
NODE_ENV=production
MODEL_PATH=$SCRIPT_DIR/server/best_siamese_transformer.pth

# Demo/Hackathon Bypass Configuration
DEMO_MODE=false
BYPASS_DATE_CHECK=true
BYPASS_MICR_CHECK=true
EOF
fi

# Load environment
set -a
source .env.local
set +a

# Stop existing PM2 processes
echo ""
echo "[1/6] Stopping existing processes..."
pm2 delete all 2>/dev/null || true

# Setup Python virtual environment
echo ""
echo "[2/6] Setting up Python environment..."
if [ ! -d "server/database/venv" ]; then
    echo "Creating Python venv..."
    python3 -m venv server/database/venv
fi
source server/database/venv/bin/activate
echo "Installing Python packages..."
pip install --quiet flask torch torchvision pillow numpy scikit-learn requests 2>/dev/null || {
    echo "Installing with --break-system-packages..."
    pip install --quiet --break-system-packages flask torch torchvision pillow numpy scikit-learn requests
}

# Install Node dependencies
echo ""
echo "[3/6] Installing Node dependencies..."
cd "$SCRIPT_DIR/server"
npm install --silent --legacy-peer-deps 2>/dev/null || npm install --legacy-peer-deps
echo "Building server..."
npm run build 2>/dev/null || echo "Build skipped (may already exist)"

cd "$SCRIPT_DIR/client"
npm install --silent --legacy-peer-deps 2>/dev/null || npm install --legacy-peer-deps

cd "$SCRIPT_DIR"

# Start all services with PM2
echo ""
echo "[4/6] Starting services with PM2..."

# Backend API
if [ -f "server/dist/server/server.js" ]; then
    pm2 start server/dist/server/server.js --name "chequemate-api" \
        --cwd "$SCRIPT_DIR/server"
else
    echo "Warning: server/dist/server/server.js not found, trying npx..."
    pm2 start "npx ts-node src/server.ts" --name "chequemate-api" \
        --cwd "$SCRIPT_DIR/server"
fi

# ML Services (optional - may not have model)
if [ -f "server/ml/fraud_prediction.py" ]; then
    pm2 start server/ml/fraud_prediction.py --name "ml-fraud" \
        --interpreter "$SCRIPT_DIR/server/database/venv/bin/python" \
        --cwd "$SCRIPT_DIR/server/ml" \
        -- --server --port 5002 || echo "ML Fraud service failed to start (optional)"
fi

if [ -f "server/ml/signature_service.py" ]; then
    pm2 start server/ml/signature_service.py --name "ml-signature" \
        --interpreter "$SCRIPT_DIR/server/database/venv/bin/python" \
        --cwd "$SCRIPT_DIR/server/ml" || echo "ML Signature service failed to start (optional)"
fi

# Frontend - IBBL (port 5000)
pm2 start npm --name "frontend-ibbl" \
    --cwd "$SCRIPT_DIR/client" \
    -- run dev:ibbl

# Frontend - Sonali (port 5001)  
pm2 start npm --name "frontend-sonali" \
    --cwd "$SCRIPT_DIR/client" \
    -- run dev:sonali

# Save PM2 config for startup
echo ""
echo "[5/6] Saving PM2 configuration..."
pm2 save
pm2 startup systemd -u $USER --hp $HOME 2>/dev/null || true

# Setup nginx
echo ""
echo "[6/6] Configuring Nginx..."
if [ -f "deploy/nginx.conf" ]; then
    # Update paths in nginx config
    sed "s|/home/ubuntu|$HOME|g" deploy/nginx.conf > /tmp/chequemate-nginx.conf
    sudo cp /tmp/chequemate-nginx.conf /etc/nginx/sites-available/chequemate
    sudo ln -sf /etc/nginx/sites-available/chequemate /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    if sudo nginx -t; then
        sudo systemctl reload nginx
        echo "Nginx configured successfully!"
    else
        echo "Nginx config error - check /etc/nginx/sites-available/chequemate"
    fi
fi

echo ""
echo "============================================"
echo "  All services started!"
echo "============================================"
echo ""
pm2 status
echo ""
echo "Access URLs (after DNS setup):"
echo "  IBBL Bank:    http://chequemate.twiggle.tech"
echo "  Sonali Bank:  http://chequemate.twiggle.tech:5001"
echo "  API:          http://chequemate.twiggle.tech/api"
echo ""
echo "Direct access (using IP):"
VM_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_IP")
echo "  IBBL Bank:    http://$VM_IP:5000"
echo "  Sonali Bank:  http://$VM_IP:5001"
echo "  API:          http://$VM_IP:3001"
echo ""
echo "Commands:"
echo "  pm2 status      - Check service status"
echo "  pm2 logs        - View all logs"
echo "  pm2 restart all - Restart all services"
echo ""
echo "For SSL (after DNS propagates):"
echo "  sudo certbot --nginx -d chequemate.twiggle.tech"
echo ""
