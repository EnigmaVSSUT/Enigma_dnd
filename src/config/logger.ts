import pino from "pino";

const isProd = process.env.NODE_ENV === "production";

/**
 * Shared structured logger. Console only (stdout) so it works unchanged
 * on Vercel, Docker and local dev.
 * - production: JSON lines (collect via your platform's log drain)
 * - development: human-readable pretty output
 * Level via LOG_LEVEL (default: debug in dev, info in prod).
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
  ...(isProd
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, singleLine: true },
        },
      }),
  redact: {
    paths: [
      "req.headers.authorization",
      "*.password",
      "*.userPassword",
      "*.token",
      "*.JWT_SECRET",
    ],
    censor: "[Redacted]",
  },
});
