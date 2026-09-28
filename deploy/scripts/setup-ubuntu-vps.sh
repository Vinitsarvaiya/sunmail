#!/usr/bin/env bash
set -e

# ==============================================================================
# SunMail Ubuntu VPS Production Provisioning Script
# ==============================================================================

echo "🌞 Starting SunMail Mail Server VPS Installation..."

# 1. Update system packages
apt-get update -y && apt-get upgrade -y
apt-get install -y curl wget git ufw certbot postfix bsd-mailx

# 2. Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pnpm

# 3. Create sunmail system user
id -u sunmail &>/dev/null || useradd -r -s /bin/false sunmail

# 4. Clone / Deploy Repository
mkdir -p /opt/sunmail /etc/sunmail
echo "Please copy the repository files to /opt/sunmail and configure /etc/sunmail/.env"

# 5. Build applications
cd /opt/sunmail
pnpm install
pnpm build

# 6. Configure Postfix
cp /opt/sunmail/deploy/postfix/main.cf /etc/postfix/main.cf
cp /opt/sunmail/deploy/postfix/master.cf /etc/postfix/master.cf
postfix reload

# 7. Install and enable Systemd service
cp /opt/sunmail/deploy/systemd/sunmail-worker.service /etc/systemd/system/sunmail-worker.service
systemctl daemon-reload
systemctl enable sunmail-worker
systemctl restart sunmail-worker

# 8. Configure Firewall (Port 25 inbound for SMTP, 22 for SSH, 80/443 for certbot)
ufw allow 22/tcp
ufw allow 25/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "✅ SunMail VPS Provisioning Completed successfully!"
