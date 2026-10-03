// Sets DATABASE_URL from discrete parts (PG*/DB*/POSTGRES_*) then runs prisma.
// Usage: node scripts/with-db-url.cjs prisma migrate dev
require("dotenv").config();

function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const user =
    process.env.PGUSER || process.env.DB_USER || process.env.POSTGRES_USER;
  const password =
    process.env.PGPASSWORD ||
    process.env.DB_PASSWORD ||
    process.env.POSTGRES_PASSWORD;
  const host = process.env.PGHOST || process.env.DB_HOST || "localhost";
  const port = process.env.PGPORT || process.env.DB_PORT || "5432";
  const name =
    process.env.PGDATABASE || process.env.DB_NAME || process.env.POSTGRES_DB;

  if (!user || !password || !name) return undefined;

  const params = new URLSearchParams({ schema: "public" });
  const sslmode = process.env.PGSSLMODE || process.env.DB_SSLMODE;
  if (sslmode) params.set("sslmode", sslmode);
  const channelBinding =
    process.env.PGCHANNELBINDING || process.env.DB_CHANNEL_BINDING;
  if (channelBinding) params.set("channel_binding", channelBinding);
  const connectTimeout =
    process.env.PGCONNECT_TIMEOUT || process.env.DB_CONNECT_TIMEOUT;
  if (connectTimeout) params.set("connect_timeout", connectTimeout);
  const poolTimeout =
    process.env.PGPOOL_TIMEOUT ||
    process.env.DB_POOL_TIMEOUT ||
    connectTimeout;
  if (poolTimeout) params.set("pool_timeout", poolTimeout);

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(
    password
  )}@${host}:${port}/${name}?${params.toString()}`;
}

const url = buildDatabaseUrl();
if (!url) {
  console.error(
    "error: set DATABASE_URL or user/password/database parts (PG*, DB_* or POSTGRES_* accepted)"
  );
  process.exit(1);
}
process.env.DATABASE_URL = url;

const { spawnSync } = require("child_process");
const result = spawnSync("npx", ["prisma", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
