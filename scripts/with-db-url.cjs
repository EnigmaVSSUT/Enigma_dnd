require("dotenv").config();

function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const host = process.env.POSTGRES_HOST || "localhost";
  const port = process.env.POSTGRES_PORT || "5432";
  const name = process.env.POSTGRES_DB;

  if (!user || !password || !name) return undefined;

  const params = new URLSearchParams({ schema: "public" });
  const sslmode = process.env.POSTGRES_SSLMODE;
  if (sslmode) params.set("sslmode", sslmode);
  const channelBinding = process.env.POSTGRES_CHANNELBINDING;
  if (channelBinding) params.set("channel_binding", channelBinding);
  const connectTimeout = process.env.POSTGRES_CONNECT_TIMEOUT;
  if (connectTimeout) params.set("connect_timeout", connectTimeout);
  const poolTimeout = process.env.POSTGRES_POOL_TIMEOUT || connectTimeout;
  if (poolTimeout) params.set("pool_timeout", poolTimeout);

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(
    password
  )}@${host}:${port}/${name}?${params.toString()}`;
}

const url = buildDatabaseUrl();
if (!url) {
  console.error(
    "error: set DATABASE_URL or POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB parts"
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
