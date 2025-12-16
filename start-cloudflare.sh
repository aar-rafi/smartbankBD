#!/bin/bash
# ============================================================
# SmartBankBD - Cloudflare Tunnel Setup & Start
# FREE unlimited tunnels with custom domain support!
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================"
echo "  SmartBankBD - Cloudflare Tunnel"
echo "============================================"

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo ""
    echo "Installing cloudflared..."
    
    # Download latest cloudflared
    curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /tmp/cloudflared
    chmod +x /tmp/cloudflared
    sudo mv /tmp/cloudflared /usr/local/bin/cloudflared
    
    echo "cloudflared installed!"
fi

echo ""
echo "Choose an option:"
echo ""
echo "  1) Quick tunnel (random URL, no setup needed)"
echo "  2) Custom domain (smartbankbd.twiggle.tech) - requires one-time setup"
echo ""
read -p "Enter choice [1]: " choice
choice=${choice:-1}

if [ "$choice" == "2" ]; then
    # Custom domain setup
    echo ""
    echo "============================================"
    echo "  Custom Domain Setup"
    echo "============================================"
    
    # Check if already logged in
    if [ ! -f ~/.cloudflared/cert.pem ]; then
        echo ""
        echo "You need to login to Cloudflare first."
        echo "This will open a browser to authenticate."
        echo ""
        read -p "Press Enter to login..."
        cloudflared tunnel login
    fi
    
    TUNNEL_NAME="smartbankbd"
    
    # Check if tunnel exists
    if ! cloudflared tunnel list | grep -q "$TUNNEL_NAME"; then
        echo ""
        echo "Creating tunnel '$TUNNEL_NAME'..."
        cloudflared tunnel create $TUNNEL_NAME
        
        echo ""
        echo "============================================"
        echo "  IMPORTANT: Add DNS Record in Cloudflare"
        echo "============================================"
        echo ""
        echo "Go to Cloudflare Dashboard -> DNS -> Add Record:"
        echo ""
        echo "  Type: CNAME"
        echo "  Name: smartbankbd"
        echo "  Target: $(cloudflared tunnel list | grep $TUNNEL_NAME | awk '{print $1}').cfargotunnel.com"
        echo "  Proxy: ON (orange cloud)"
        echo ""
        read -p "Press Enter after adding DNS record..."
    fi
    
    # Create config file
    TUNNEL_ID=$(cloudflared tunnel list | grep $TUNNEL_NAME | awk '{print $1}')
    
    cat > "$SCRIPT_DIR/cloudflared-config.yml" << EOF
tunnel: $TUNNEL_ID
credentials-file: $HOME/.cloudflared/$TUNNEL_ID.json

ingress:
  # IBBL Bank (main)
  - hostname: smartbankbd.twiggle.tech
    service: http://localhost:5000
  # Sonali Bank  
  - hostname: sonali-smartbankbd.twiggle.tech
    service: http://localhost:5001
  # API
  - hostname: api-smartbankbd.twiggle.tech
    service: http://localhost:3001
  # Catch-all
  - service: http_status:404
EOF

    echo ""
    echo "Starting tunnel with custom domain..."
    echo ""
    echo "Access URLs:"
    echo "  IBBL:   https://smartbankbd.twiggle.tech"
    echo "  Sonali: https://sonali-smartbankbd.twiggle.tech"
    echo "  API:    https://api-smartbankbd.twiggle.tech"
    echo ""
    
    cloudflared tunnel --config "$SCRIPT_DIR/cloudflared-config.yml" run $TUNNEL_NAME

else
    # Quick tunnel (no setup needed)
    echo ""
    echo "============================================"
    echo "  Quick Tunnel Mode"
    echo "============================================"
    echo ""
    echo "Starting quick tunnel for IBBL (port 5000)..."
    echo ""
    echo "TIP: For Sonali Bank, run in another terminal:"
    echo "  cloudflared tunnel --url http://localhost:5001"
    echo ""
    
    cloudflared tunnel --url http://localhost:5000
fi
