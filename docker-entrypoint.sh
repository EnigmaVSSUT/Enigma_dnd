#!/bin/sh
# Build DATABASE_URL from discrete parts when a full URL is not provided,
# then apply migrations and start the API.
# The Prisma CLI reads DATABASE_URL straight from the environment,
# so this must happen in the shell (app code alone is not enough).
set -e

if [ -z "${DATABASE_URL:-}" ]; then
  DB_USER="${DB_USER:-${POSTGRES_USER:-}}"
  DB_PASSWORD="${DB_PASSWORD:-${POSTGRES_PASSWORD:-}}"
  DB_NAME="${DB_NAME:-${POSTGRES_DB:-}}"
  DB_HOST="${DB_HOST:-db}"
  DB_PORT="${DB_PORT:-5432}"

  if [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
    echo "error: set DATABASE_URL or DB_USER/DB_PASSWORD/DB_NAME (POSTGRES_* also accepted)" >&2
    exit 1
  fi

  # encodeURIComponent via node so special chars in user/password are safe
  DATABASE_URL="$(node -e 'console.log(`postgresql://${encodeURIComponent(process.argv[1])}:${encodeURIComponent(process.argv[2])}@${process.argv[3]}:${process.argv[4]}/${process.argv[5]}?schema=public`)' "$DB_USER" "$DB_PASSWORD" "$DB_HOST" "$DB_PORT" "$DB_NAME")"
  export DATABASE_URL
fi

npx prisma migrate deploy

exec node dist/index.js
