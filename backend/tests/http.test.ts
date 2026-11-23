import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "../src/shared/errors";
import { asyncHandler, errorHandler, notFoundHandler, parseWithSchema } from "../src/shared/http";

type MockResponse = Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };

function mockRes(): MockResponse {
  const res = {} as MockResponse;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("parseWithSchema", () => {
  const schema = z.object({ name: z.string().min(1), age: z.number().int().positive() });
  it("returns the parsed value when valid", () => {
    expect(parseWithSchema(schema, { name: "Priya", age: 30 })).toEqual({ name: "Priya", age: 30 });
  });
  it("throws a 400 ApiError with per-field details when invalid", () => {
    try {
      parseWithSchema(schema, { name: "", age: -1 });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(400);
      expect((e as ApiError).message).toBe("Validation failed");
      const details = (e as ApiError).details as { field: string; message: string }[];
      expect(details.map((d) => d.field).sort()).toEqual(["age", "name"]);
    }
  });
});

describe("asyncHandler", () => {
  it("passes through a successful handler without calling next", async () => {
    const next = vi.fn();
    const handler = asyncHandler(async (_req: Request, res: Response) => {
      res.json({ ok: true });
    });
    const res = mockRes();
    handler({} as Request, res, next as unknown as NextFunction);
    await new Promise((r) => setTimeout(r, 0));
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });
  it("forwards a rejection to next", async () => {
    const next = vi.fn();
    const boom = new Error("boom");
    const handler = asyncHandler(async () => {
      throw boom;
    });
    handler({} as Request, mockRes(), next as unknown as NextFunction);
    await new Promise((r) => setTimeout(r, 0));
    expect(next).toHaveBeenCalledWith(boom);
  });
});

describe("errorHandler", () => {
  it("ApiError -> its status + API_ERROR envelope with details", () => {
    const res = mockRes();
    errorHandler(new ApiError(400, "Bad input", [{ field: "x" }]), {} as Request, res, (() => undefined) as unknown as NextFunction);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "API_ERROR", message: "Bad input", details: [{ field: "x" }] },
    });
  });
  it("unknown error -> 500 INTERNAL_ERROR, internals not leaked", () => {
    const res = mockRes();
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    errorHandler(new Error("db password is hunter2"), {} as Request, res, (() => undefined) as unknown as NextFunction);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("notFoundHandler", () => {
  it("returns the 404 NOT_FOUND envelope", () => {
    const res = mockRes();
    notFoundHandler({} as Request, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: { code: "NOT_FOUND", message: "Route not found" } });
  });
});
