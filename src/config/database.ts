import dotenv from "dotenv";

dotenv.config();

import { PrismaClient } from "@prisma/client";

/**
 * Resolve the Postgres connection URL.
 *
 * Precedence:
 *   1. DATABASE_URL (full URL, takes priority over everything)
 *   2. Discrete parts, accepting both libpq names (PGHOST/PGUSER/PGPASSWORD/
 *      PGDATABASE/PGPORT — e.g. Neon) and app names (DB_* with POSTGRES_*
 *      aliases — e.g. the local docker-compose database).
 */
export function buildDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

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

  if (!user || !password || !name) {
    return undefined;
  }

  // Hosted providers (Neon) require TLS: PGSSLMODE=require (and optionally
  // PGCHANNELBINDING=require). Local docker Postgres sets neither.
  const params = new URLSearchParams({ schema: "public" });
  const sslmode = process.env.PGSSLMODE || process.env.DB_SSLMODE;
  if (sslmode) {
    params.set("sslmode", sslmode);
  }
  const channelBinding =
    process.env.PGCHANNELBINDING || process.env.DB_CHANNEL_BINDING;
  if (channelBinding) {
    params.set("channel_binding", channelBinding);
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
export const prisma = new PrismaClient();
