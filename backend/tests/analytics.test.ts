import { describe, expect, it } from "vitest";
import { average, median, paginationMeta, toUsd } from "../src/utils/analytics";

describe("median / average", () => {
  it("median of odd and even lists", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBe(0);
  });
  it("average", () => {
    expect(average([100, 200, 300])).toBe(200);
    expect(average([])).toBe(0);
  });
  it("toUsd converts by fixed FX rate (INR 83 per USD)", () => {
    expect(toUsd(8300, "INR")).toBe(100);
    expect(toUsd(100, "USD")).toBe(100);
  });
  it("pagination meta: 10,000 rows at 20/page = 500 pages", () => {
    expect(paginationMeta(10000, 1, 20)).toEqual({ total: 10000, page: 1, pageSize: 20, totalPages: 500 });
    expect(paginationMeta(0, 1, 20).totalPages).toBe(1);
  });
});
