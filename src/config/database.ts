import dotenv from "dotenv";

dotenv.config();

import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

/**
 * Resolve the Postgres connection URL from discrete parts, so .env only
 * keeps one copy of the credentials. Precedence:
 *   1. DATABASE_URL (full URL, e.g. Neon override)
 *   2. libpq names (PGHOST/PGUSER/PGPASSWORD/PGDATABASE/PGPORT — e.g. Neon)
 */
export function buildDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const host = process.env.PGHOST || "localhost";
  const port = process.env.PGPORT || "5432";
  const name = process.env.PGDATABASE;

  if (!user || !password || !name) {
    return undefined;
  }

  // Hosted providers (Neon) require TLS: PGSSLMODE=require (and optionally
  // PGCHANNELBINDING=require). Local docker Postgres sets neither.
  const params = new URLSearchParams({ schema: "public" });
  const sslmode = process.env.PGSSLMODE;
  if (sslmode) {
    params.set("sslmode", sslmode);
  }
  const channelBinding = process.env.PGCHANNELBINDING;
  if (channelBinding) {
    params.set("channel_binding", channelBinding);
  }
  // Neon cold-starts can exceed Prisma's 5s default connect timeout.
  const connectTimeout = process.env.PGCONNECT_TIMEOUT;
  if (connectTimeout) {
    params.set("connect_timeout", connectTimeout);
  }
  // Prisma's pool timeout defaults to 10s and is separate from
  // connect_timeout. With ~2.3s TCP + TLS + Neon wake, the first checkout
  // after idle can exceed 10s (P2024) even when connect_timeout=20 allows
  // the TCP connect. Fall back to the connect timeout so PGCONNECT_TIMEOUT
  // alone still raises the ceiling; PGPOOL_TIMEOUT overrides when set.
  const poolTimeout = process.env.PGPOOL_TIMEOUT || connectTimeout;
  if (poolTimeout) {
    params.set("pool_timeout", poolTimeout);
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(
    password
  )}@${host}:${port}/${name}?${params.toString()}`;
}

const databaseUrl = buildDatabaseUrl();

// Export it onto process.env so PrismaClient (which reads
// env("DATABASE_URL") from the schema) picks up the constructed URL.
if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
}

// Shared client — import this instead of `new PrismaClient()` elsewhere.
export const prisma = new PrismaClient({
  log: [
    { emit: "event", level: "query" },
    { emit: "event", level: "warn" },
    { emit: "event", level: "error" },
  ],
});

const SLOW_QUERY_MS = Number(process.env.SLOW_QUERY_THRESHOLD_MS || 1000);

// Prisma v6 emits log events via $on when `emit: "event"` is set.
type PrismaLogEvent = {
  timestamp: Date;
  message: string;
  target?: string;
};
type PrismaQueryEvent = PrismaLogEvent & {
  query: string;
  params: string;
  duration: number;
};

(prisma as unknown as {
  $on(event: "query", cb: (e: PrismaQueryEvent) => void): void;
  $on(event: "warn" | "error", cb: (e: PrismaLogEvent) => void): void;
}).$on("query", (e) => {
  const base = { query: e.query, params: e.params, durationMs: e.duration };
  if (e.duration >= SLOW_QUERY_MS) {
    logger.warn(base, "slow prisma query");
  } else {
    logger.debug(base, "prisma query");
  }
});
(prisma as unknown as {
  $on(event: "warn" | "error", cb: (e: PrismaLogEvent) => void): void;
}).$on("warn", (e) => {
  logger.warn({ target: e.target, message: e.message }, "prisma warning");
});
(prisma as unknown as {
  $on(event: "warn" | "error", cb: (e: PrismaLogEvent) => void): void;
}).$on("error", (e) => {
  logger.error({ target: e.target, message: e.message }, "prisma error");
});
