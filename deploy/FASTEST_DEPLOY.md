# FASTEST DEPLOYMENT - 15 Minutes

## What You Need
- GCP Console open in browser
- This terminal open
- DNS access for twiggle.tech

---

## STEP 1: Create VM in GCP Console (3 min)

1. Go to: https://console.cloud.google.com/compute/instances
2. Click **"CREATE INSTANCE"**
3. Fill in:
   - **Name**: `chequemate`
   - **Region**: `us-central1` (Zone: `us-central1-a`)
   - **Machine type**: `e2-medium` (2 vCPU, 4GB)
   - **Boot disk**: Click "Change"
     - OS: Ubuntu
     - Version: Ubuntu 22.04 LTS
     - Size: 30 GB
   - **Firewall**: Check both:
     - [x] Allow HTTP traffic
     - [x] Allow HTTPS traffic
4. Click **"CREATE"**
5. **Copy the External IP** (you'll need it!)

---

## STEP 2: Add DNS Record (1 min)

Go to your DNS provider for `twiggle.tech` and add:

```
Type: A
Name: chequemate
Value: [YOUR_VM_IP]
TTL: 300 (or lowest available)
```

---

## STEP 3: Upload Code (3 min)

Run this from your local terminal:

```bash
cd /home/torr20/Documents/chequemate-ai

# Replace YOUR_VM_IP with actual IP
VM_IP="YOUR_VM_IP"

# Upload (this takes ~2-3 min)
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'venv' \
  --exclude '__pycache__' \
  -e "ssh -o StrictHostKeyChecking=no" \
  . ubuntu@$VM_IP:~/chequemate-ai/
```

Or use gcloud:
```bash
gcloud compute scp --recurse --zone=us-central1-a \
  --compress . chequemate:~/chequemate-ai/
```

---

## STEP 4: SSH & Setup (8 min)

```bash
# SSH into VM
ssh ubuntu@$VM_IP
# Or: gcloud compute ssh chequemate --zone=us-central1-a

# Run setup
cd ~/chequemate-ai/deploy
chmod +x setup-server.sh
sudo ./setup-server.sh

# Start services
cd ~/chequemate-ai
chmod +x start-prod.sh
./start-prod.sh
```

---

## STEP 5: Get SSL (2 min)

Still on the VM:
```bash
sudo certbot --nginx -d chequemate.twiggle.tech --non-interactive --agree-tos -m your@email.com
```

---

## DONE!

Open: https://chequemate.twiggle.tech

**Login:**
- Employee or Manager
- Any bank works

---

## Quick Commands

```bash
# Check status
pm2 status

# View logs  
pm2 logs

# Restart all
pm2 restart all

# Check nginx
sudo nginx -t
sudo systemctl status nginx
```

---

## If Something Fails

### Database not working?
```bash
sudo -u postgres psql -c "\l"  # list databases
sudo systemctl restart postgresql
```

### Frontend not loading?
```bash
pm2 restart frontend-ibbl frontend-sonali
pm2 logs frontend-ibbl
```

### API errors?
```bash
pm2 logs chequemate-api
```

### Nginx errors?
```bash
sudo tail -f /var/log/nginx/error.log
sudo nginx -t
```
