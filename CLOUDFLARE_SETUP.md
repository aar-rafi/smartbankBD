# SmartBankBD - Cloudflare Tunnel Setup

## Why Cloudflare Tunnel?
- FREE (unlimited bandwidth)
- Custom domain support
- No random URLs
- SSL included
- Better performance than ngrok

---

## Quick Start (Random URL, No Setup)

### Terminal 1 - Start App:
```bash
cd /home/torr20/Documents/chequemate-ai
./start-demo.sh
```

### Terminal 2 - IBBL Tunnel:
```bash
cloudflared tunnel --url http://localhost:5000
```

### Terminal 3 - Sonali Tunnel:
```bash
cloudflared tunnel --url http://localhost:5001
```

Done! Copy the `https://xxxx.trycloudflare.com` URLs.

---

## Custom Domain Setup (smartbankbd.twiggle.tech)

### One-Time Setup:

#### 1. Install cloudflared
```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/
```

#### 2. Login to Cloudflare
```bash
cloudflared tunnel login
# Opens browser - select your domain (twiggle.tech)
```

#### 3. Create Tunnel
```bash
cloudflared tunnel create smartbankbd
# Note the tunnel ID shown
```

#### 4. Add DNS Records in Cloudflare Dashboard

Go to: https://dash.cloudflare.com -> twiggle.tech -> DNS

Add these CNAME records:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | smartbankbd | `<TUNNEL_ID>.cfargotunnel.com` | ON |
| CNAME | sonali.smartbankbd | `<TUNNEL_ID>.cfargotunnel.com` | ON |
| CNAME | api.smartbankbd | `<TUNNEL_ID>.cfargotunnel.com` | ON |

#### 5. Create Config File

Create `cloudflared-config.yml`:
```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /home/YOUR_USER/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: smartbankbd.twiggle.tech
    service: http://localhost:5000
  - hostname: sonali.smartbankbd.twiggle.tech
    service: http://localhost:5001
  - hostname: api.smartbankbd.twiggle.tech
    service: http://localhost:3001
  - service: http_status:404
```

### Run with Custom Domain:

```bash
# Terminal 1 - Start app
./start-demo.sh

# Terminal 2 - Start tunnel
cloudflared tunnel --config cloudflared-config.yml run smartbankbd
```

### Access:
- IBBL Bank: https://smartbankbd.twiggle.tech
- Sonali Bank: https://sonali.smartbankbd.twiggle.tech
- API: https://api.smartbankbd.twiggle.tech

---

## All-in-One Script

Just run:
```bash
./start-cloudflare.sh
```

This will:
1. Install cloudflared if needed
2. Let you choose quick tunnel or custom domain
3. Guide you through setup if needed

---

## Troubleshooting

### Check tunnel status
```bash
cloudflared tunnel list
cloudflared tunnel info smartbankbd
```

### Delete tunnel (if needed)
```bash
cloudflared tunnel delete smartbankbd
```

### Logs
```bash
cloudflared tunnel --loglevel debug --url http://localhost:5000
```

### DNS not working?
- Make sure proxy is ON (orange cloud) in Cloudflare
- Wait 1-2 minutes for DNS propagation
- Check: `dig smartbankbd.twiggle.tech`
