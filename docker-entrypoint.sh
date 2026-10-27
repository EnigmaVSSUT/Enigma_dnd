#!/bin/sh
# Build DATABASE_URL from discrete POSTGRES_* parts when a full URL is not
# provided, then apply migrations and start the API.
# The Prisma CLI reads DATABASE_URL straight from the environment,
set -e

if [ -z "${DATABASE_URL:-}" ]; then
  if [ -z "${POSTGRES_USER:-}" ] || [ -z "${POSTGRES_PASSWORD:-}" ] || [ -z "${POSTGRES_DB:-}" ]; then
    echo "error: set DATABASE_URL or POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB" >&2
    exit 1
  fi

  # Inside the compose network the database is the `db` service, not localhost.
  DB_HOST="${POSTGRES_HOST:-db}"
  DB_PORT="${POSTGRES_PORT:-5432}"

  # encodeURIComponent via node so special chars in user/password are safe
  DATABASE_URL="$(node -e 'const p=new URLSearchParams({schema:"public"});if(process.argv[6])p.set("sslmode",process.argv[6]);if(process.argv[7])p.set("channel_binding",process.argv[7]);const ct=process.env.POSTGRES_CONNECT_TIMEOUT;if(ct)p.set("connect_timeout",ct);const pt=process.env.POSTGRES_POOL_TIMEOUT||ct;if(pt)p.set("pool_timeout",pt);console.log(`postgresql://${encodeURIComponent(process.argv[1])}:${encodeURIComponent(process.argv[2])}@${process.argv[3]}:${process.argv[4]}/${process.argv[5]}?${p.toString()}`)' "$POSTGRES_USER" "$POSTGRES_PASSWORD" "$DB_HOST" "$DB_PORT" "$POSTGRES_DB" "${POSTGRES_SSLMODE:-}" "${POSTGRES_CHANNELBINDING:-}")"
  export DATABASE_URL
fi

npx prisma migrate deploy

exec node dist/index.js
