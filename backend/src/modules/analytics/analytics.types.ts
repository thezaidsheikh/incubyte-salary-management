/** Full response of GET /api/analytics/summary. */
export interface AnalyticsSummary {
  totalEmployees: number;
  payrollByCurrency: { currency: string; count: number; total: number; average: number; median: number }[];
  averageSalaryUsd: number;
  medianSalaryUsd: number;
  byDepartment: { name: string; count: number; averageUsd: number; medianUsd: number }[];
  byCountry: { name: string; count: number; averageUsd: number; medianUsd: number }[];
  byLevel: { name: string; count: number; averageUsd: number; medianUsd: number }[];
  distributionUsd: { bucket: string; count: number }[];
  topEarners: {
    name: string;
    jobTitle: string;
    department: string;
    country: string;
    baseSalary: number;
    currency: string;
    usd: number;
  }[];
  outliers: {
    name: string;
    department: string;
    baseSalary: number;
    currency: string;
    usd: number;
    departmentMedianUsd: number;
  }[];
}

/** One employee as the top-earners/outliers computation needs it. */
export interface TopEarnerInput {
  firstName: string;
  lastName: string;
  jobTitle: string;
  department: string;
  country: string;
  baseSalary: number;
  currency: string;
}
