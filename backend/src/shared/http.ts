import type { NextFunction, Request, Response } from "express";
import { ApiError } from "./errors.js";

/** A Zod-like schema: anything with a `parse` that throws on bad input. */
export interface Parsable<T> {
  parse(value: unknown): T;
}

/**
 * Validate an unknown value (body or query) against a schema.
 * Why here: every controller validates the same way, so the 400 + field
 * details mapping lives once instead of once per controller.
 * @param schema Schema with a `parse` method (a Zod schema).
 * @param value Raw input to validate.
 * @returns The parsed, typed value.
 * @throws ApiError 400 "Validation failed" with per-field details.
 */
export function parseWithSchema<T>(schema: Parsable<T>, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (e: unknown) {
    const err = e as { issues?: { path: (string | number)[]; message: string }[] };
    throw new ApiError(
      400,
      "Validation failed",
      err.issues?.map((i) => ({ field: i.path.join("."), message: i.message })),
    );
  }
}

type AsyncRouteHandler = (req: Request, res: Response) => Promise<void>;

/**
 * Wrap an async route handler so a rejected promise reaches Express error
 * handling instead of hanging the request (Express 4 has no built-in
 * async error catching).
 * @param fn Async handler to wrap.
 * @returns An Express handler that forwards rejections to `next`.
 */
export function asyncHandler(fn: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res).catch(next);
  };
}

/**
 * Express error-handling middleware (4 args, so Express treats it as one).
 * ApiErrors become their status + the standard error envelope; anything
 * else is logged and becomes a generic 500 so internals never leak.
 * @param err The thrown value (ApiError or unexpected).
 * @param _req Unused request.
 * @param res Response to write the error envelope to.
 * @param _next Unused next (required by Express for error middleware).
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: { code: "API_ERROR", message: err.message, details: err.details },
    });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
}

/**
 * Catch-all 404 handler, mounted after every route.
 * @param _req Unused request.
 * @param res Response to write the NOT_FOUND envelope to.
 */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
}
