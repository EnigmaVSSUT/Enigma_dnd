#!/bin/sh
# Build DATABASE_URL from discrete parts when a full URL is not provided,
# then apply migrations and start the API.
# The Prisma CLI reads DATABASE_URL straight from the environment,
# so this must happen in the shell (app code alone is not enough).
set -e

if [ -z "${DATABASE_URL:-}" ]; then
  if [ -z "${PGUSER:-}" ] || [ -z "${PGPASSWORD:-}" ] || [ -z "${PGDATABASE:-}" ]; then
    echo "error: set DATABASE_URL or PGUSER/PGPASSWORD/PGDATABASE parts" >&2
    exit 1
  fi

  DB_HOST="${PGHOST:-db}"
  DB_PORT="${PGPORT:-5432}"

  # encodeURIComponent via node so special chars in user/password are safe
  DATABASE_URL="$(node -e 'const p=new URLSearchParams({schema:"public"});if(process.argv[6])p.set("sslmode",process.argv[6]);if(process.argv[7])p.set("channel_binding",process.argv[7]);const ct=process.env.PGCONNECT_TIMEOUT;if(ct)p.set("connect_timeout",ct);const pt=process.env.PGPOOL_TIMEOUT||ct;if(pt)p.set("pool_timeout",pt);console.log(`postgresql://${encodeURIComponent(process.argv[1])}:${encodeURIComponent(process.argv[2])}@${process.argv[3]}:${process.argv[4]}/${process.argv[5]}?${p.toString()}`)' "$PGUSER" "$PGPASSWORD" "$DB_HOST" "$DB_PORT" "$PGDATABASE" "${PGSSLMODE:-}" "${PGCHANNELBINDING:-}")"
  export DATABASE_URL
fi

npx prisma migrate deploy

exec node dist/index.js
