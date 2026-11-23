import { average, median, toUsd } from "../../shared/analytics.js";
import type { EmployeeRepository, SalaryPoint } from "../employees/index.js";
import type { AnalyticsSummary, TopEarnerInput } from "./analytics.types.js";

// Pattern: Service layer — analytics is pure computation over repository
// data. computeAnalytics takes plain arrays, so it is unit-testable with
// no repository at all; the service only fetches the two inputs.

/**
 * Group salary points by one key and summarise each group in USD.
 * Groups are ordered by headcount, largest first.
 * @param points Salary points to group.
 * @param key Field to group by: department, country or level.
 * @returns Per-group count, average and median USD, sorted by count desc.
 */
export function groupStats(
  points: SalaryPoint[],
  key: "department" | "country" | "level",
): { name: string; count: number; averageUsd: number; medianUsd: number }[] {
  const groups = new Map<string, number[]>();
  for (const p of points) {
    const arr = groups.get(p[key]) ?? [];
    arr.push(toUsd(p.baseSalary, p.currency));
    groups.set(p[key], arr);
  }
  return [...groups.entries()]
    .map(([name, v]) => ({
      name,
      count: v.length,
      averageUsd: Math.round(average(v)),
      medianUsd: Math.round(median(v)),
    }))
    .sort((a, b) => b.count - a.count);
}

/** USD distribution buckets: [label, lower bound (inclusive), upper bound (exclusive)]. */
const BUCKETS: [string, number, number][] = [
  ["< $2k", 0, 2000],
  ["$2k–$5k", 2000, 5000],
  ["$5k–$8k", 5000, 8000],
  ["$8k–$12k", 8000, 12000],
  ["> $12k", 12000, Infinity],
];

/**
 * Compute the full analytics summary from raw inputs — pure function,
 * no I/O, no repository. An outlier is an employee paid more than twice
 * their department's median USD salary.
 * @param points One salary point per employee.
 * @param employeesForTop Employees for top-earners/outliers (needs names).
 * @returns The analytics summary.
 */
export function computeAnalytics(
  points: SalaryPoint[],
  employeesForTop: TopEarnerInput[],
): AnalyticsSummary {
  const usd = points.map((p) => toUsd(p.baseSalary, p.currency));
  const byCurrency = new Map<string, number[]>();
  for (const p of points) {
    const arr = byCurrency.get(p.currency) ?? [];
    arr.push(p.baseSalary);
    byCurrency.set(p.currency, arr);
  }
  const payrollByCurrency = [...byCurrency.entries()]
    .map(([currency, v]) => ({
      currency,
      count: v.length,
      total: v.reduce((a, b) => a + b, 0),
      average: Math.round(average(v)),
      median: Math.round(median(v)),
    }))
    .sort((a, b) => b.total - a.total);
  const distributionUsd = BUCKETS.map(([bucket, lo, hi]) => ({
    bucket,
    count: usd.filter((v) => v >= lo && v < hi).length,
  }));
  const deptMedian = new Map(groupStats(points, "department").map((g) => [g.name, g.medianUsd]));
  const ranked = [...employeesForTop]
    .map((e) => ({ ...e, name: `${e.firstName} ${e.lastName}`, usd: Math.round(toUsd(e.baseSalary, e.currency)) }))
    .sort((a, b) => b.usd - a.usd);
  return {
    totalEmployees: points.length,
    payrollByCurrency,
    averageSalaryUsd: Math.round(average(usd)),
    medianSalaryUsd: Math.round(median(usd)),
    byDepartment: groupStats(points, "department"),
    byCountry: groupStats(points, "country"),
    byLevel: groupStats(points, "level"),
    distributionUsd,
    topEarners: ranked
      .slice(0, 10)
      .map(({ name, jobTitle, department, country, baseSalary, currency, usd: u }) => ({
        name,
        jobTitle,
        department,
        country,
        baseSalary,
        currency,
        usd: u,
      })),
    outliers: ranked
      // Attach each employee's department median once: a department
      // missing from the points has median 0 and can never be an outlier.
      .map((e) => ({ ...e, deptMedianUsd: deptMedian.get(e.department) ?? 0 }))
      .filter((e) => e.deptMedianUsd > 0 && e.usd > 2 * e.deptMedianUsd)
      .slice(0, 20)
      .map((e) => ({
        name: e.name,
        department: e.department,
        baseSalary: e.baseSalary,
        currency: e.currency,
        usd: e.usd,
        departmentMedianUsd: e.deptMedianUsd,
      })),
  };
}

/**
 * Analytics business logic: fetch salary points + employees, then run
 * the pure computation. Depends on the repository interface only.
 */
export class AnalyticsService {
  /**
   * @param repo Employee store, injected as the interface.
   */
  constructor(private repo: EmployeeRepository) {}

  /**
   * Build the analytics summary for all employees.
   * @returns The summary (total 0 and empty groups when there are no employees).
   */
  async summary(): Promise<AnalyticsSummary> {
    const points = await this.repo.salaryPoints();
    const all = await this.repo.allForExport({});
    return computeAnalytics(points, all);
  }
}
