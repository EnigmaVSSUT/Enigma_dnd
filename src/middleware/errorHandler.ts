import { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger";

/** Catch-all for unknown routes — logged as warn via httpLogger. */
export function notFound(_req: Request, res: Response) {
  res.status(404).json({ message: "Route not found" });
}

/**
 * Centralized error handler. Logs the stack, hides internals from clients.
 * Must be registered AFTER all routes. Controllers that already sent a
 * response never reach here.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const error = err as Error;
  logger.error(
    {
      err: error,
      method: req.method,
      url: req.originalUrl,
    },
    "unhandled request error"
  );
  const status = (err as { status?: number }).status ?? 500;
  res.status(status).json({
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error.message || "Internal server error",
  });
}
