import pinoHttp from "pino-http";
import { logger } from "../config/logger";

/**
 * HTTP access logs: method, URL, status, latency. Mounted first so every
 * request (including 404s and errors) is logged. Authorization header
 * and tokens are redacted via the shared logger config.
 */
export const httpLogger = pinoHttp({
  logger,
  autoLogging: true,
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
});
