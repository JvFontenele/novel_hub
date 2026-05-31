#!/usr/bin/env bash
# Deploy / update novel_hub on the VPS.
# Run from the repo root: bash deploy/deploy.sh
set -euo pipefail

COMPOSE="docker compose -f docker-compose.prod.yml"

# Verify .env exists
if [ ! -f .env ]; then
  echo "ERROR: .env not found. Create one first:"
  echo "  cp .env.example .env && nano .env"
  exit 1
fi

# Load and validate required secrets
set -o allexport; source .env; set +o allexport

if [[ "${JWT_SECRET:-}" == *"change_me"* ]] || [[ -z "${JWT_SECRET:-}" ]]; then
  echo "ERROR: Set JWT_SECRET in .env (use a long random string)."
  exit 1
fi
if [[ "${POSTGRES_PASSWORD:-}" == *"change_me"* ]] || [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
  echo "ERROR: Set POSTGRES_PASSWORD in .env."
  exit 1
fi

echo "==> Pulling latest code..."
git pull --ff-only

echo "==> Building images..."
$COMPOSE build --pull

echo "==> Starting services..."
$COMPOSE up -d --remove-orphans

echo "==> Waiting for API to be healthy..."
for i in $(seq 1 30); do
  if $COMPOSE exec -T api wget -qO- http://localhost:4000/health >/dev/null 2>&1; then
    echo "    API is up."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "    WARNING: API did not respond after 150s, check logs: $COMPOSE logs api"
  else
    echo "    Attempt $i/30 — waiting 5s..."
    sleep 5
  fi
done

echo ""
echo "==> Deployment complete!"
echo ""
$COMPOSE ps
echo ""
if [[ "${CADDY_HOST:-:80}" == ":80" ]]; then
  echo "Access: http://$(curl -s --max-time 3 ifconfig.me 2>/dev/null || echo '<server-ip>')"
else
  echo "Access: https://${CADDY_HOST}"
fi
echo ""
echo "First time? Register via the web UI, then promote yourself to admin:"
echo "  bash deploy/make-admin.sh your@email.com"
