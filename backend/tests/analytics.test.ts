import { describe, expect, it } from "vitest";
import { average, median, paginationMeta, toUsd } from "../src/shared/analytics";
import { computeAnalytics, groupStats } from "../src/modules/analytics/analytics.service";
import type { SalaryPoint } from "../src/modules/employees/index";
import type { TopEarnerInput } from "../src/modules/analytics/analytics.types";

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
  it("toUsd falls back to 1:1 for an unknown currency", () => {
    expect(toUsd(500, "XXX")).toBe(500);
  });
  it("pagination meta: 10,000 rows at 20/page = 500 pages", () => {
    expect(paginationMeta(10000, 1, 20)).toEqual({ total: 10000, page: 1, pageSize: 20, totalPages: 500 });
    expect(paginationMeta(0, 1, 20).totalPages).toBe(1);
  });
});

function point(department: string, baseSalary: number, currency = "USD", country = "USA", level = "Senior"): SalaryPoint {
  return { department, country, level, baseSalary, currency };
}
function earner(firstName: string, department: string, baseSalary: number, currency = "USD"): TopEarnerInput {
  return { firstName, lastName: "Test", jobTitle: "Engineer", department, country: "USA", baseSalary, currency };
}

describe("groupStats", () => {
  it("groups by key, orders by count desc, rounds averages/medians", () => {
    const stats = groupStats(
      [point("Engineering", 1000), point("Engineering", 3000), point("Sales", 2000)],
      "department",
    );
    expect(stats[0]).toEqual({ name: "Engineering", count: 2, averageUsd: 2000, medianUsd: 2000 });
    expect(stats[1]).toEqual({ name: "Sales", count: 1, averageUsd: 2000, medianUsd: 2000 });
  });
  it("returns [] for no points", () => {
    expect(groupStats([], "department")).toEqual([]);
  });
});

describe("computeAnalytics", () => {
  it("empty input: zeros, empty groups, no earners or outliers", () => {
    const s = computeAnalytics([], []);
    expect(s.totalEmployees).toBe(0);
    expect(s.averageSalaryUsd).toBe(0);
    expect(s.medianSalaryUsd).toBe(0);
    expect(s.payrollByCurrency).toEqual([]);
    expect(s.byDepartment).toEqual([]);
    expect(s.byCountry).toEqual([]);
    expect(s.byLevel).toEqual([]);
    expect(s.distributionUsd.every((b) => b.count === 0)).toBe(true);
    expect(s.topEarners).toEqual([]);
    expect(s.outliers).toEqual([]);
  });
  it("single employee: median == average == its USD salary", () => {
    const s = computeAnalytics([point("Engineering", 8300, "INR")], [earner("Priya", "Engineering", 8300, "INR")]);
    expect(s.totalEmployees).toBe(1);
    expect(s.averageSalaryUsd).toBe(100);
    expect(s.medianSalaryUsd).toBe(100);
    expect(s.payrollByCurrency).toEqual([{ currency: "INR", count: 1, total: 8300, average: 8300, median: 8300 }]);
    expect(s.topEarners).toHaveLength(1);
    expect(s.topEarners[0].name).toBe("Priya Test");
    expect(s.outliers).toEqual([]);
  });
  it("even count: median is the mean of the two middle salaries", () => {
    const s = computeAnalytics(
      [point("Engineering", 1000), point("Engineering", 2000), point("Engineering", 3000), point("Engineering", 4000)],
      [],
    );
    expect(s.medianSalaryUsd).toBe(2500);
    expect(s.averageSalaryUsd).toBe(2500);
  });
  it("distribution buckets count salaries on their lower bound", () => {
    const s = computeAnalytics(
      [point("Engineering", 1000), point("Engineering", 2000), point("Engineering", 5000), point("Engineering", 8000), point("Engineering", 12000), point("Engineering", 20000)],
      [],
    );
    expect(s.distributionUsd.map((b) => b.count)).toEqual([1, 1, 1, 1, 2]);
  });
  it("topEarners keeps at most 10, highest USD first", () => {
    const points = Array.from({ length: 12 }, (_, i) => point("Engineering", (i + 1) * 1000));
    const earners = Array.from({ length: 12 }, (_, i) => earner(`E${i}`, "Engineering", (i + 1) * 1000));
    const s = computeAnalytics(points, earners);
    expect(s.topEarners).toHaveLength(10);
    expect(s.topEarners[0].usd).toBe(12000);
    expect(s.topEarners[9].usd).toBe(3000);
  });
  it("outliers: above 2x department median, capped at 20, none when all equal", () => {
    const dept = "Engineering";
    const points = [
      point(dept, 1000), point(dept, 1000), point(dept, 1000), point(dept, 1000), point(dept, 1000),
      point(dept, 10000),
    ];
    const earners = [
      ...Array.from({ length: 5 }, (_, i) => earner(`Base${i}`, dept, 1000)),
      earner("Rich", dept, 10000),
    ];
    const s = computeAnalytics(points, earners);
    expect(s.outliers).toHaveLength(1);
    expect(s.outliers[0].name).toBe("Rich Test");
    expect(s.outliers[0].departmentMedianUsd).toBe(1000);
    const flat = computeAnalytics([point(dept, 1000), point(dept, 1000)], [earner("A", dept, 1000), earner("B", dept, 1000)]);
    expect(flat.outliers).toEqual([]);
  });
  it("outliers: an employee whose department has no salary points is ignored, not an outlier", () => {
    const s = computeAnalytics(
      [point("Engineering", 1000), point("Engineering", 1000), point("Engineering", 1000)],
      [earner("Ghost", "Sales", 999999)],
    );
    expect(s.totalEmployees).toBe(3);
    expect(s.outliers).toEqual([]);
    expect(s.topEarners).toHaveLength(1);
    expect(s.topEarners[0].name).toBe("Ghost Test");
  });
  it("payrollByCurrency is ordered by total desc", () => {
    const s = computeAnalytics(
      [point("Engineering", 100, "USD"), point("Engineering", 8300, "INR"), point("Engineering", 8300, "INR")],
      [],
    );
    expect(s.payrollByCurrency[0].currency).toBe("INR");
    expect(s.payrollByCurrency[0].total).toBe(16600);
  });
});
