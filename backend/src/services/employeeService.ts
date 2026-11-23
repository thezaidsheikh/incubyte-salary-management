import { average, median, paginationMeta, toUsd } from "../utils/analytics";
import { badRequest, notFound } from "../utils/errors";
import type { EmployeeRepository, SalaryPoint } from "../repositories/employeeRepository";
import type { CreateEmployeeInput, ListQuery, UpdateSalaryInput } from "../validation/employee";

export class EmployeeService {
  constructor(private repo: EmployeeRepository) {}
  list(q: ListQuery) {
    return this.repo.list(q, q).then(({ items, total }) => ({ data: items, meta: paginationMeta(total, q.page, q.pageSize) }));
  }
  async getById(id: string) {
    const e = await this.repo.getById(id);
    if (!e) throw notFound("Employee");
    return e;
  }
  async create(input: CreateEmployeeInput) {
    try {
      return await this.repo.create({ ...input, dateOfJoining: new Date(input.dateOfJoining), managerId: input.managerId ?? null });
    } catch (e: unknown) {
      if (e instanceof Error && /unique/i.test(e.message)) throw badRequest("An employee with this email already exists");
      throw e;
    }
  }
  async updateSalary(id: string, input: UpdateSalaryInput) {
    const current = await this.repo.getById(id);
    if (!current) throw notFound("Employee");
    if (input.newSalary === current.baseSalary) throw badRequest("newSalary must differ from the current salary");
    const result = await this.repo.updateSalary(id, input.newSalary, input.reason, input.changedBy ?? "HR Manager");
    if (!result) throw notFound("Employee");
    return result;
  }
}

export interface AnalyticsSummary {
  totalEmployees: number;
  payrollByCurrency: { currency: string; count: number; total: number; average: number; median: number }[];
  averageSalaryUsd: number;
  medianSalaryUsd: number;
  byDepartment: { name: string; count: number; averageUsd: number; medianUsd: number }[];
  byCountry: { name: string; count: number; averageUsd: number; medianUsd: number }[];
  byLevel: { name: string; count: number; averageUsd: number; medianUsd: number }[];
  distributionUsd: { bucket: string; count: number }[];
  topEarners: { name: string; jobTitle: string; department: string; country: string; baseSalary: number; currency: string; usd: number }[];
  outliers: { name: string; department: string; baseSalary: number; currency: string; usd: number; departmentMedianUsd: number }[];
}

function groupStats(points: SalaryPoint[], key: "department" | "country" | "level") {
  const groups = new Map<string, number[]>();
  for (const p of points) {
    const arr = groups.get(p[key]) ?? [];
    arr.push(toUsd(p.baseSalary, p.currency));
    groups.set(p[key], arr);
  }
  return [...groups.entries()].map(([name, v]) => ({ name, count: v.length, averageUsd: Math.round(average(v)), medianUsd: Math.round(median(v)) }))
    .sort((a, b) => b.count - a.count);
}

export function computeAnalytics(points: SalaryPoint[], employeesForTop: { firstName: string; lastName: string; jobTitle: string; department: string; country: string; baseSalary: number; currency: string }[]): AnalyticsSummary {
  const usd = points.map((p) => toUsd(p.baseSalary, p.currency));
  const byCurrency = new Map<string, number[]>();
  for (const p of points) {
    const arr = byCurrency.get(p.currency) ?? [];
    arr.push(p.baseSalary);
    byCurrency.set(p.currency, arr);
  }
  const payrollByCurrency = [...byCurrency.entries()].map(([currency, v]) => ({ currency, count: v.length, total: v.reduce((a, b) => a + b, 0), average: Math.round(average(v)), median: Math.round(median(v)) }))
    .sort((a, b) => b.total - a.total);
  const buckets: [string, number, number][] = [["< $2k", 0, 2000], ["$2k–$5k", 2000, 5000], ["$5k–$8k", 5000, 8000], ["$8k–$12k", 8000, 12000], ["> $12k", 12000, Infinity]];
  const distributionUsd = buckets.map(([bucket, lo, hi]) => ({ bucket, count: usd.filter((v) => v >= lo && v < hi).length }));
  const deptMedian = new Map(groupStats(points, "department").map((g) => [g.name, g.medianUsd]));
  const ranked = [...employeesForTop].map((e) => ({ ...e, name: `${e.firstName} ${e.lastName}`, usd: Math.round(toUsd(e.baseSalary, e.currency)) }))
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
    topEarners: ranked.slice(0, 10).map(({ name, jobTitle, department, country, baseSalary, currency, usd: u }) => ({ name, jobTitle, department, country, baseSalary, currency, usd: u })),
    outliers: ranked.filter((e) => (deptMedian.get(e.department) ?? 0) > 0 && e.usd > 2 * (deptMedian.get(e.department) ?? 0))
      .slice(0, 20).map((e) => ({ name: e.name, department: e.department, baseSalary: e.baseSalary, currency: e.currency, usd: e.usd, departmentMedianUsd: deptMedian.get(e.department) ?? 0 })),
  };
}

export class AnalyticsService {
  constructor(private repo: EmployeeRepository) {}
  async summary(): Promise<AnalyticsSummary> {
    const points = await this.repo.salaryPoints();
    const all = await this.repo.allForExport({});
    return computeAnalytics(points, all);
  }
}
