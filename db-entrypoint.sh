#!/bin/sh
# Entrypoint for the Postgres container in docker-compose.
#
# On every start it:
#   1. builds DATABASE_URL from the POSTGRES_* parts (the Prisma CLI only reads
#      DATABASE_URL; the server itself still uses POSTGRES_*),
#   2. starts the stock Postgres entrypoint in the background so the server can
#      boot (and initdb the volume the first time),
#   3. waits until Postgres accepts TCP connections,
#   4. applies every pending Prisma migration (`prisma migrate deploy`),
#   5. runs each prisma/seed/*.sql file exactly once, tracked in _seed_history,
#   6. marks the container ready and hands control back to Postgres.
#
# Seeds are plain SQL on purpose: psql is already in the image, so seeding does
# not depend on the Prisma client or on compiled application code.
set -eu

log() { echo "[db-entrypoint] $*"; }
fail() { echo "[db-entrypoint] error: $*" >&2; exit 1; }

# Postgres listens on 127.0.0.1 inside this container. The compose port
# mapping only affects how the host reaches it.
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${PGPORT:-5432}"
SEED_DIR="${SEED_DIR:-/app/prisma/seed}"
SCHEMA_FILE="${SCHEMA_FILE:-/app/prisma/schema.prisma}"
READY_MARKER="/tmp/db-init-complete"

# A restart can keep /tmp from the previous run; never look "healthy"
# while migrations are still being applied.
rm -f "$READY_MARKER"

: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"

if [ -z "${DATABASE_URL:-}" ]; then
  # encodeURIComponent via node so passwords containing @ : / ? # stay valid.
  DATABASE_URL="$(node -e 'console.log(`postgresql://${encodeURIComponent(process.argv[1])}:${encodeURIComponent(process.argv[2])}@${process.argv[3]}:${process.argv[4]}/${process.argv[5]}?schema=public`)' \
    "$POSTGRES_USER" "$POSTGRES_PASSWORD" "$DB_HOST" "$DB_PORT" "$POSTGRES_DB")"
fi
export DATABASE_URL

# psql helpers used by the seed step.
export PGHOST="$DB_HOST"
export PGPORT="$DB_PORT"
export PGUSER="$POSTGRES_USER"
export PGDATABASE="$POSTGRES_DB"
export PGPASSWORD="$POSTGRES_PASSWORD"

# --- Start the real Postgres server in the background -----------------------
/usr/local/bin/docker-entrypoint.sh "$@" &
PG_PID=$!

stop_postgres() {
  if kill -0 "$PG_PID" 2>/dev/null; then
    kill -TERM "$PG_PID" 2>/dev/null || true
    wait "$PG_PID" 2>/dev/null || true
  fi
}

trap 'stop_postgres; exit 143' TERM
trap 'stop_postgres; exit 130' INT

# --- Wait for Postgres ------------------------------------------------------
# -h forces a TCP check, so the temporary socket-only server that initdb runs
# is never mistaken for a ready database.
log "waiting for postgres on ${DB_HOST}:${DB_PORT}"
READY_TIMEOUT="${DB_READY_TIMEOUT:-60}"
elapsed=0
until pg_isready -q -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
  if ! kill -0 "$PG_PID" 2>/dev/null; then
    fail "postgres exited before becoming ready"
  fi
  elapsed=$((elapsed + 1))
  if [ "$elapsed" -ge "$READY_TIMEOUT" ]; then
    stop_postgres
    fail "postgres did not become ready within ${READY_TIMEOUT}s"
  fi
  sleep 1
done

# --- Apply migrations -------------------------------------------------------
[ -f "$SCHEMA_FILE" ] || fail "prisma schema not found at $SCHEMA_FILE"
log "applying prisma migrations"
if ! prisma migrate deploy --schema "$SCHEMA_FILE"; then
  stop_postgres
  fail "prisma migrate deploy failed"
fi

# --- Apply seeds ------------------------------------------------------------
if [ -d "$SEED_DIR" ]; then
  log "checking seeds in $SEED_DIR"
  psql -q -v ON_ERROR_STOP=1 \
    -c 'CREATE TABLE IF NOT EXISTS "_seed_history" (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());' \
    >/dev/null

  for seed_file in "$SEED_DIR"/*.sql; do
    [ -f "$seed_file" ] || continue

    seed_name="$(basename "$seed_file")"
    escaped_name="$(printf '%s' "$seed_name" | sed "s/'/''/g")"

    applied="$(psql -tA -v ON_ERROR_STOP=1 \
      -c "SELECT 1 FROM \"_seed_history\" WHERE filename = '$escaped_name';")"
    if [ "$applied" = "1" ]; then
      log "seed $seed_name already applied, skipping"
      continue
    fi

    log "applying seed $seed_name"
    # -1 makes the seed SQL and its history row commit together, so a failed
    # seed is retried on the next start instead of being marked as done.
    if ! psql -q -v ON_ERROR_STOP=1 -1 -f "$seed_file" \
      -c "INSERT INTO \"_seed_history\" (filename) VALUES ('$escaped_name');"; then
      stop_postgres
      fail "seed $seed_name failed"
    fi
  done
else
  log "no seed directory at $SEED_DIR, skipping seeds"
fi

touch "$READY_MARKER"
log "database is migrated, seeded and ready"

# Stay in the foreground as PID 1 and let Postgres own the lifecycle from here.
wait "$PG_PID"
