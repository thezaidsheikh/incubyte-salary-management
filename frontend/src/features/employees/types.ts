/**
 * Shared domain types for employees and analytics.
 * Single source of truth — no other file re-declares these shapes.
 */

/** An employee record as returned by the backend. */
export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  country: string;
  currency: string;
  jobTitle: string;
  level: string;
  managerId: string | null;
  dateOfJoining: string;
  employmentStatus: string;
  baseSalary: number;
}

/** One entry in an employee's salary-change history. */
export interface SalaryHistory {
  id: string;
  oldSalary: number;
  newSalary: number;
  currency: string;
  reason: string;
  changedBy: string;
  changedAt: string;
}

/** Pagination metadata returned with employee lists. */
export interface PageMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Dashboard analytics summary (all USD figures are FX-normalised). */
export interface Analytics {
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
