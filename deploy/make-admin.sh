#!/usr/bin/env bash
# Promote an existing user to admin role.
# Usage: bash deploy/make-admin.sh user@example.com
# Run this after the user has registered via the web UI.
set -euo pipefail

EMAIL="${1:-}"
if [[ -z "$EMAIL" ]]; then
  echo "Usage: bash deploy/make-admin.sh <email>"
  exit 1
fi

UPDATED=$(docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U novel_hub -d novel_hub -tAc \
  "UPDATE users SET role='admin' WHERE email = '$EMAIL' RETURNING email;")

if [[ -z "$UPDATED" ]]; then
  echo "No user found with email: $EMAIL"
  echo "Register first via the web UI, then run this script."
  exit 1
fi

echo "User '$UPDATED' is now an admin."
