#!/bin/sh
# Build DATABASE_URL from discrete parts when a full URL is not provided,
# then apply migrations and start the API.
# The Prisma CLI reads DATABASE_URL straight from the environment,
# so this must happen in the shell (app code alone is not enough).
set -e

if [ -z "${DATABASE_URL:-}" ]; then
  DB_USER="${PGUSER:-${DB_USER:-${POSTGRES_USER:-}}}"
  DB_PASSWORD="${PGPASSWORD:-${DB_PASSWORD:-${POSTGRES_PASSWORD:-}}}"
  DB_NAME="${PGDATABASE:-${DB_NAME:-${POSTGRES_DB:-}}}"
  DB_HOST="${PGHOST:-${DB_HOST:-db}}"
  DB_PORT="${PGPORT:-${DB_PORT:-5432}}"
  DB_SSLMODE="${PGSSLMODE:-${DB_SSLMODE:-}}"
  DB_CHANNEL_BINDING="${PGCHANNELBINDING:-${DB_CHANNEL_BINDING:-}}"

  if [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
    echo "error: set DATABASE_URL or user/password/database parts (PG*, DB_* or POSTGRES_* accepted)" >&2
    exit 1
  fi

  # encodeURIComponent via node so special chars in user/password are safe
  DATABASE_URL="$(node -e 'const p=new URLSearchParams({schema:"public"});if(process.argv[7])p.set("sslmode",process.argv[7]);if(process.argv[8])p.set("channel_binding",process.argv[8]);console.log(`postgresql://${encodeURIComponent(process.argv[1])}:${encodeURIComponent(process.argv[2])}@${process.argv[3]}:${process.argv[4]}/${process.argv[5]}?${p.toString()}`)' "$DB_USER" "$DB_PASSWORD" "$DB_HOST" "$DB_PORT" "$DB_NAME" "$DB_SSLMODE" "$DB_CHANNEL_BINDING")"
  export DATABASE_URL
fi

npx prisma migrate deploy

exec node dist/index.js
