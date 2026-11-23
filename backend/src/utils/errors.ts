export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}
export function notFound(what = "Resource") { return new ApiError(404, `${what} not found`); }
export function badRequest(message: string, details?: unknown) { return new ApiError(400, message, details); }
