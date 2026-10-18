// Sets DATABASE_URL from discrete PG* parts then runs prisma.
// Precedence: DATABASE_URL (full URL, e.g. Neon override) > PG* (libpq names).
// Usage: node scripts/with-db-url.cjs prisma migrate dev
require("dotenv").config();

function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const host = process.env.PGHOST || "localhost";
  const port = process.env.PGPORT || "5432";
  const name = process.env.PGDATABASE;

  if (!user || !password || !name) return undefined;

  const params = new URLSearchParams({ schema: "public" });
  const sslmode = process.env.PGSSLMODE;
  if (sslmode) params.set("sslmode", sslmode);
  const channelBinding = process.env.PGCHANNELBINDING;
  if (channelBinding) params.set("channel_binding", channelBinding);
  const connectTimeout = process.env.PGCONNECT_TIMEOUT;
  if (connectTimeout) params.set("connect_timeout", connectTimeout);
  const poolTimeout = process.env.PGPOOL_TIMEOUT || connectTimeout;
  if (poolTimeout) params.set("pool_timeout", poolTimeout);

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(
    password
  )}@${host}:${port}/${name}?${params.toString()}`;
}

const url = buildDatabaseUrl();
if (!url) {
  console.error(
    "error: set DATABASE_URL or PGUSER/PGPASSWORD/PGDATABASE parts"
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
