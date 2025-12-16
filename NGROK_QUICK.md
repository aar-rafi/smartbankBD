# SmartBankBD - ngrok Quick Deploy (5 minutes)

## Step 1: Install ngrok (if not installed)

```bash
# Option A: snap
sudo snap install ngrok

# Option B: apt
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok
```

## Step 2: Authenticate ngrok

```bash
# Get your token from: https://dashboard.ngrok.com/get-started/your-authtoken
ngrok config add-authtoken YOUR_TOKEN_HERE
```

## Step 3: Start the app

```bash
cd /home/torr20/Documents/chequemate-ai
./start-demo.sh
```

## Step 4: Start ngrok tunnels (in new terminals)

### Terminal 2 - IBBL Bank (main):
```bash
ngrok http 5000
```

### Terminal 3 - Sonali Bank:
```bash
ngrok http 5001
```

### Terminal 4 - API (if frontend needs direct API access):
```bash
ngrok http 3001
```

## Done!

Copy the ngrok URLs from each terminal:
- IBBL: `https://xxxx-xx-xx.ngrok-free.app`
- Sonali: `https://yyyy-yy-yy.ngrok-free.app`

---

## Custom Domain (ngrok paid plan)

If you have ngrok paid plan with custom domain:

```bash
# For smartbankbd.twiggle.tech
ngrok http --domain=smartbankbd.twiggle.tech 5000
```

Add CNAME in your DNS:
```
smartbankbd.twiggle.tech -> your-ngrok-domain.ngrok.io
```

---

## All-in-One (paid ngrok only)

Edit `ngrok.yml` with your authtoken, then:

```bash
ngrok start --all --config ngrok.yml
```
