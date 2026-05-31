#!/usr/bin/env bash
# One-time VPS setup — run as root on Ubuntu 22.04
set -euo pipefail

echo "==> Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

echo "==> Installing Docker..."
apt-get install -y -qq ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable --now docker

echo "==> Configuring firewall..."
apt-get install -y -qq ufw
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

echo "==> Installing git..."
apt-get install -y -qq git

echo "==> VPS setup complete."
echo ""
echo "Next steps:"
echo "  1. Clone the repo:  git clone <repo-url> /opt/novel_hub"
echo "  2. Create .env:     cd /opt/novel_hub && cp .env.example .env && nano .env"
echo "  3. Deploy:          cd /opt/novel_hub && bash deploy/deploy.sh"
