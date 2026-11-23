import { describe, expect, it } from "vitest";
import { generateEmployees } from "../src/utils/seedData";

describe("seed determinism", () => {
  it("same seed => same employees", () => {
    const a = generateEmployees(100, 42);
    const b = generateEmployees(100, 42);
    expect(a).toEqual(b);
  });
  it("different seed => different first employee", () => {
    expect(generateEmployees(10, 42)[0].email).not.toBe(generateEmployees(10, 7)[0].email);
  });
  it("generates exactly 10,000 unique emails with salaries in band", () => {
    const all = generateEmployees(10000, 42);
    expect(all).toHaveLength(10000);
    expect(new Set(all.map((e) => e.email)).size).toBe(10000);
    expect(all.every((e) => e.baseSalary > 0)).toBe(true);
    expect(all.every((e) => ["India", "USA", "UK", "Germany", "Singapore", "Canada", "Australia", "UAE"].includes(e.country))).toBe(true);
  });
});
