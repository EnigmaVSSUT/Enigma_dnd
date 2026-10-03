#!/bin/sh
# Apply pending migrations, then start the API.
# Requires DATABASE_URL (see .env / docker-compose.yml).
set -e

if [ -z "${DATABASE_URL:-}" ]; then
  echo "error: DATABASE_URL is not set" >&2
  exit 1
fi

npx prisma migrate deploy

exec node dist/index.js
