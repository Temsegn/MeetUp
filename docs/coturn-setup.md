# TURN Server Setup (coturn)

WebRTC media (audio/video) requires a TURN server when users are behind NAT.
Without TURN, meetings work on localhost but fail on deployed servers for
many real-world clients (mobile networks, corporate firewalls, etc.).

## 1. Install coturn

```bash
sudo apt update && sudo apt install -y coturn
```

## 2. Configure coturn

Edit `/etc/turnserver.conf`:

```conf
# Listening port
listening-port=3478
tls-listening-port=5349

# Your server's public IP
external-ip=46.246.120.148

# Use fingerprint and long-term credentials
fingerprint
lt-cred-mech

# Realm (any domain or hostname)
realm=samtal.app

# Create a user — must match TURN_USERNAME / TURN_PASSWORD in .env
user=samtal:change-me-strong-password

# Log
log-file=/var/log/turnserver.log
```

## 3. Enable and start

```bash
# Uncomment TURNSERVER_ENABLED in the defaults file
sudo sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn

sudo systemctl enable coturn
sudo systemctl restart coturn
sudo systemctl status coturn
```

## 4. Open firewall ports

```bash
# TURN UDP + TCP
sudo ufw allow 3478/udp
sudo ufw allow 3478/tcp
sudo ufw allow 5349/tcp   # TLS TURN (optional)

# WebRTC media relay range
sudo ufw allow 49152:65535/udp
```

## 5. Set environment variables in .env

```env
TURN_URL=turn:46.246.120.148:3478
TURN_USERNAME=samtal
TURN_PASSWORD=change-me-strong-password
```

## 6. Rebuild and redeploy

```bash
docker compose down
docker compose up -d --build
```

## Test the TURN server

Visit https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
Add your TURN server credentials and click "Gather candidates".
You should see `typ relay` candidates — that confirms TURN is working.
