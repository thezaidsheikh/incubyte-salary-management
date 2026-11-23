import { describe, expect, it } from "vitest";
import { formatMoney, formatDate } from "./format";

describe("format helpers", () => {
  it("formats INR without decimals", () => {
    expect(formatMoney(150000, "INR")).toContain("150,000");
  });
  it("formats a date in short form", () => {
    expect(formatDate("2022-03-01T00:00:00.000Z")).toContain("2022");
  });
});
