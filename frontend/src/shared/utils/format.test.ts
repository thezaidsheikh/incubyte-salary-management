import { describe, expect, it } from "vitest";
import { formatDate, formatMoney } from "./format";

describe("formatMoney", () => {
  it("formats INR without decimals", () => {
    expect(formatMoney(150000, "INR")).toContain("150,000");
  });

  it("formats USD with the dollar sign", () => {
    expect(formatMoney(4555, "USD")).toBe("$4,555");
  });

  it("rounds fractional amounts to whole units", () => {
    expect(formatMoney(1500.6, "USD")).toBe("$1,501");
  });

  it("formats zero", () => {
    expect(formatMoney(0, "EUR")).toContain("0");
  });

  it("falls back to plain text for an unknown currency code", () => {
    expect(formatMoney(1500, "NOTACUR")).toBe("NOTACUR 1,500");
  });
});

describe("formatDate", () => {
  it("formats an ISO date in short form", () => {
    expect(formatDate("2022-03-01T00:00:00.000Z")).toContain("2022");
    expect(formatDate("2022-03-01T00:00:00.000Z")).toContain("Mar");
  });

  it("renders Invalid Date for unparseable input instead of throwing", () => {
    expect(formatDate("not-a-date")).toBe("Invalid Date");
  });
});
