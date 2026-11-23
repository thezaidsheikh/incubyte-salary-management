/**
 * Application error with an HTTP status. Services throw this; the shared
 * error handler turns it into the `{ error: { code, message, details } }`
 * envelope, so no controller ever builds an error response by hand.
 */
export class ApiError extends Error {
  /**
   * @param status HTTP status code to send (400, 404, ...).
   * @param message Human-readable message shown to the client.
   * @param details Optional machine-readable detail (e.g. validation fields).
   */
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/**
 * Build a 404 ApiError for a missing resource.
 * @param what Resource name, e.g. "Employee"; defaults to "Resource".
 * @returns An ApiError with status 404.
 */
export function notFound(what = "Resource"): ApiError {
  return new ApiError(404, `${what} not found`);
}

/**
 * Build a 400 ApiError for invalid input or a rejected business rule.
 * @param message Why the request was rejected.
 * @param details Optional extra detail for the client.
 * @returns An ApiError with status 400.
 */
export function badRequest(message: string, details?: unknown): ApiError {
  return new ApiError(400, message, details);
}
