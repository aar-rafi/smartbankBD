# ChequeMate - 20-Minute GCP Deployment

## Prerequisites
- GCP account with credits
- `gcloud` CLI installed and authenticated
- Domain: twiggle.tech (you'll use chequemate.twiggle.tech)

## Step 1: Create VM (2 min)

```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Create VM
gcloud compute instances create chequemate-demo \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=30GB \
  --tags=http-server,https-server

# Open firewall
gcloud compute firewall-rules create allow-http --allow tcp:80 --target-tags http-server 2>/dev/null || true
gcloud compute firewall-rules create allow-https --allow tcp:443 --target-tags https-server 2>/dev/null || true
```

## Step 2: Get VM IP & Setup DNS (1 min)

```bash
# Get external IP
gcloud compute instances describe chequemate-demo --zone=us-central1-a --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

**Add DNS A record:**
- Go to your DNS provider for twiggle.tech
- Add A record: `chequemate` -> [VM_IP]
- (Optional) Add A record: `chequemate-api` -> [VM_IP]

## Step 3: Upload Code (2 min)

```bash
# From your local machine, in chequemate-ai directory
cd /home/torr20/Documents/chequemate-ai

# Upload everything
gcloud compute scp --recurse --zone=us-central1-a \
  --compress \
  . chequemate-demo:~/chequemate-ai
```

## Step 4: SSH & Run Setup (10 min)

```bash
# SSH into VM
gcloud compute ssh chequemate-demo --zone=us-central1-a

# Run the setup script
cd ~/chequemate-ai/deploy
chmod +x setup-server.sh
sudo ./setup-server.sh
```

## Step 5: Start Services (2 min)

```bash
# Still on VM
cd ~/chequemate-ai
chmod +x start-prod.sh
./start-prod.sh
```

## Step 6: Verify (1 min)

Open in browser:
- https://chequemate.twiggle.tech (IBBL Bank)
- https://chequemate.twiggle.tech/sonali (Sonali Bank)

## Done!

Total time: ~15-20 minutes

---

## Troubleshooting

### Check services
```bash
pm2 status
pm2 logs
```

### Check nginx
```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

### Restart everything
```bash
pm2 restart all
sudo systemctl restart nginx
```

### SSL Issues
```bash
sudo certbot --nginx -d chequemate.twiggle.tech
```
