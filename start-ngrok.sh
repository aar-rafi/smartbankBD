#!/bin/bash
# ============================================================
# SmartBankBD - Start with ngrok tunnels
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================"
echo "  SmartBankBD - ngrok Deployment"
echo "============================================"

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo ""
    echo "ngrok not found! Install it first:"
    echo "  sudo snap install ngrok"
    echo "  # OR"
    echo "  curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null"
    echo "  echo 'deb https://ngrok-agent.s3.amazonaws.com buster main' | sudo tee /etc/apt/sources.list.d/ngrok.list"
    echo "  sudo apt update && sudo apt install ngrok"
    echo ""
    echo "Then authenticate:"
    echo "  ngrok config add-authtoken YOUR_TOKEN"
    echo ""
    exit 1
fi

# Start the demo services first
echo ""
echo "[1/2] Starting application services..."
./start-demo.sh &
DEMO_PID=$!

# Wait for services to start
echo ""
echo "Waiting for services to start..."
sleep 10

# Start ngrok tunnels
echo ""
echo "[2/2] Starting ngrok tunnels..."
echo ""

# Option 1: If you have a custom domain configured in ngrok
if [ -f "ngrok.yml" ] && grep -q "YOUR_NGROK_AUTHTOKEN_HERE" ngrok.yml; then
    echo "NOTE: Update ngrok.yml with your authtoken for custom domain"
    echo ""
fi

# Start ngrok with multiple tunnels
echo "Starting ngrok..."
echo ""
echo "Choose an option:"
echo "  1) Single tunnel (IBBL only) - Free tier"
echo "  2) Multiple tunnels (requires ngrok paid plan)"
echo ""
read -p "Enter choice [1]: " choice
choice=${choice:-1}

if [ "$choice" == "2" ]; then
    # Multiple tunnels - requires paid ngrok
    ngrok start --all --config ngrok.yml
else
    # Single tunnel - free tier
    echo ""
    echo "Starting single tunnel for IBBL (port 5000)..."
    echo ""
    echo "For Sonali Bank, run in another terminal:"
    echo "  ngrok http 5001"
    echo ""
    ngrok http 5000
fi
