/** One employee row as the rest of the app sees it (camelCase, app types). */
export interface EmployeeRow {
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
  dateOfJoining: Date;
  employmentStatus: string;
  baseSalary: number;
  createdAt: Date;
  updatedAt: Date;
}

/** One salary-change audit row from salary_history. */
export interface SalaryHistoryRow {
  id: string;
  employeeId: string;
  oldSalary: number;
  newSalary: number;
  currency: string;
  reason: string;
  changedBy: string;
  changedAt: Date;
}

/** Filters a list/export query can apply; all optional, combined with AND. */
export interface EmployeeFilters {
  search?: string;
  department?: string;
  country?: string;
  level?: string;
}

/** Minimal salary data point used by analytics (no names, no ids). */
export interface SalaryPoint {
  department: string;
  country: string;
  level: string;
  baseSalary: number;
  currency: string;
}

/** Fields a caller supplies to create an employee (id/timestamps assigned). */
export type EmployeeCreateData = Omit<EmployeeRow, "id" | "createdAt" | "updatedAt" | "employmentStatus">;

/** An employee plus their salary history, as GET /api/employees/:id returns. */
export type EmployeeWithHistory = EmployeeRow & { salaryHistory: SalaryHistoryRow[] };
