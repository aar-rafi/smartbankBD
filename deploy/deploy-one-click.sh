#!/bin/bash
# ============================================================
# ChequeMate One-Click GCP Deployment
# Run this locally to deploy everything to GCP
# Usage: ./deploy-one-click.sh YOUR_PROJECT_ID
# ============================================================

set -e

PROJECT_ID=${1:-""}
ZONE="us-central1-a"
VM_NAME="chequemate-demo"
DOMAIN="chequemate.twiggle.tech"

if [ -z "$PROJECT_ID" ]; then
    echo "Usage: ./deploy-one-click.sh YOUR_GCP_PROJECT_ID"
    echo ""
    echo "Example: ./deploy-one-click.sh my-project-123"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

echo "============================================"
echo "  ChequeMate One-Click Deployment"
echo "============================================"
echo ""
echo "Project: $PROJECT_ID"
echo "Zone: $ZONE"
echo "Domain: $DOMAIN"
echo ""

# Set project
echo "[1/6] Setting GCP project..."
gcloud config set project $PROJECT_ID

# Check if VM exists
VM_EXISTS=$(gcloud compute instances list --filter="name=$VM_NAME" --format="value(name)" 2>/dev/null || true)

if [ -z "$VM_EXISTS" ]; then
    echo ""
    echo "[2/6] Creating VM..."
    gcloud compute instances create $VM_NAME \
        --zone=$ZONE \
        --machine-type=e2-medium \
        --image-family=ubuntu-2204-lts \
        --image-project=ubuntu-os-cloud \
        --boot-disk-size=30GB \
        --tags=http-server,https-server \
        --metadata=startup-script='#!/bin/bash
apt-get update -qq
apt-get install -y rsync'
    
    # Wait for VM to be ready
    echo "Waiting for VM to be ready..."
    sleep 30
else
    echo ""
    echo "[2/6] VM already exists, skipping creation..."
fi

# Create firewall rules if they don't exist
echo ""
echo "[3/6] Ensuring firewall rules..."
gcloud compute firewall-rules create allow-http --allow tcp:80 --target-tags http-server 2>/dev/null || true
gcloud compute firewall-rules create allow-https --allow tcp:443 --target-tags https-server 2>/dev/null || true

# Get VM IP
echo ""
echo "[4/6] Getting VM IP..."
VM_IP=$(gcloud compute instances describe $VM_NAME --zone=$ZONE --format='get(networkInterfaces[0].accessConfigs[0].natIP)')
echo "VM IP: $VM_IP"

# Upload code
echo ""
echo "[5/6] Uploading code to VM..."
cd "$APP_DIR"

# Create exclude file for faster upload
cat > /tmp/rsync-exclude << 'EOF'
node_modules
.git
*.pyc
__pycache__
venv
.venv
*.log
.DS_Store
EOF

# Use rsync via gcloud
gcloud compute ssh $VM_NAME --zone=$ZONE --command="mkdir -p ~/chequemate-ai"
gcloud compute scp --recurse --zone=$ZONE --compress \
    --exclude-from=/tmp/rsync-exclude \
    "$APP_DIR"/* "$VM_NAME:~/chequemate-ai/"

# Run setup on VM
echo ""
echo "[6/6] Running setup on VM..."
gcloud compute ssh $VM_NAME --zone=$ZONE --command="
cd ~/chequemate-ai/deploy
chmod +x setup-server.sh
sudo ./setup-server.sh
cd ~/chequemate-ai
chmod +x start-prod.sh
./start-prod.sh
"

echo ""
echo "============================================"
echo "  Deployment Complete!"
echo "============================================"
echo ""
echo "VM IP: $VM_IP"
echo ""
echo "IMPORTANT: Add DNS A record:"
echo "  chequemate.twiggle.tech -> $VM_IP"
echo ""
echo "After DNS propagates (~5 min), access:"
echo "  http://chequemate.twiggle.tech"
echo ""
echo "For SSL certificate:"
echo "  gcloud compute ssh $VM_NAME --zone=$ZONE"
echo "  sudo certbot --nginx -d chequemate.twiggle.tech"
echo ""
