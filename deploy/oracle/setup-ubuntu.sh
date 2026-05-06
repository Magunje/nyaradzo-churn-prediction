#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Magunje/nyaradzo-churn-prediction.git}"
APP_DIR="${APP_DIR:-/opt/nyaradzo-churn-prediction}"

export DEBIAN_FRONTEND=noninteractive

sudo apt-get update
sudo apt-get install -y ca-certificates curl git

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
fi

sudo systemctl enable --now docker

if [ -d "$APP_DIR/.git" ]; then
  sudo git -C "$APP_DIR" pull --ff-only
else
  sudo mkdir -p "$(dirname "$APP_DIR")"
  sudo git clone "$REPO_URL" "$APP_DIR"
fi

sudo chown -R "$USER:$USER" "$APP_DIR"

cd "$APP_DIR"
sudo docker compose -f deploy/oracle/docker-compose.yml up -d --build

if command -v iptables >/dev/null 2>&1; then
  sudo iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || \
    sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
fi

echo
echo "Deployment started."
echo "Check status with:"
echo "  cd $APP_DIR && sudo docker compose -f deploy/oracle/docker-compose.yml ps"
echo
echo "Check logs with:"
echo "  cd $APP_DIR && sudo docker compose -f deploy/oracle/docker-compose.yml logs -f app"
echo
