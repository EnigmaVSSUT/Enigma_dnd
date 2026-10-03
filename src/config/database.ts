import dotenv from "dotenv";

dotenv.config();

import { PrismaClient } from "@prisma/client";

/**
 * Resolve the Postgres connection URL.
 *
 * Precedence:
 *   1. DATABASE_URL (full URL, e.g. hosted DBs / overrides)
 *   2. Discrete parts: DB_* (falls back to POSTGRES_* aliases,
 *      which is what the official postgres image uses)
 */
export function buildDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = process.env.DB_USER || process.env.POSTGRES_USER;
  const password = process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD;
  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "5432";
  const name = process.env.DB_NAME || process.env.POSTGRES_DB;

  if (!user || !password || !name) {
    return undefined;
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(
    password
  )}@${host}:${port}/${name}?schema=public`;
}

const databaseUrl = buildDatabaseUrl();

// Export it onto process.env so PrismaClient (which reads
// env("DATABASE_URL") from the schema) picks up the constructed URL.
if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
}

// Shared client — import this instead of `new PrismaClient()` elsewhere.
export const prisma = new PrismaClient();
