import { describe, expect, it } from "vitest";
import { COUNTRIES, DEPARTMENTS, LEVELS, currencyForCountry } from "./constants";

describe("shared constants", () => {
  it("lists the ten departments used by the filters and the form", () => {
    expect(DEPARTMENTS).toHaveLength(10);
    expect(DEPARTMENTS).toContain("Engineering");
  });

  it("lists eight countries with their payroll currencies", () => {
    expect(COUNTRIES).toHaveLength(8);
    expect(COUNTRIES.find((c) => c.name === "India")).toEqual({ name: "India", currency: "INR" });
    expect(COUNTRIES.find((c) => c.name === "USA")?.currency).toBe("USD");
  });

  it("lists six seniority levels", () => {
    expect(LEVELS).toEqual(["Junior", "Mid", "Senior", "Lead", "Manager", "Director"]);
  });

  it("currencyForCountry returns the mapped currency", () => {
    expect(currencyForCountry("Germany")).toBe("EUR");
    expect(currencyForCountry("UAE")).toBe("AED");
  });

  it("currencyForCountry falls back to INR for an unknown country", () => {
    expect(currencyForCountry("Atlantis")).toBe("INR");
  });
});
