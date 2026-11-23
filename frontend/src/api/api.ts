const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
export interface Employee {
  id: string; firstName: string; lastName: string; email: string; department: string;
  country: string; currency: string; jobTitle: string; level: string; managerId: string | null;
  dateOfJoining: string; employmentStatus: string; baseSalary: number;
}
export interface SalaryHistory { id: string; oldSalary: number; newSalary: number; currency: string; reason: string; changedBy: string; changedAt: string; }
export interface PageMeta { total: number; page: number; pageSize: number; totalPages: number; }
export interface Analytics {
  totalEmployees: number;
  payrollByCurrency: { currency: string; count: number; total: number; average: number; median: number }[];
  averageSalaryUsd: number; medianSalaryUsd: number;
  byDepartment: { name: string; count: number; averageUsd: number; medianUsd: number }[];
  byCountry: { name: string; count: number; averageUsd: number; medianUsd: number }[];
  byLevel: { name: string; count: number; averageUsd: number; medianUsd: number }[];
  distributionUsd: { bucket: string; count: number }[];
  topEarners: { name: string; jobTitle: string; department: string; country: string; baseSalary: number; currency: string; usd: number }[];
  outliers: { name: string; department: string; baseSalary: number; currency: string; usd: number; departmentMedianUsd: number }[];
}
async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { headers: { "Content-Type": "application/json" }, ...init });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((body as { error?: { message?: string } }).error?.message ?? `Request failed (${r.status})`);
  return (body as { data: T }).data;
}
export const api = {
  health: () => req<{ status: string }>("/api/health"),
  listEmployees: (params: Record<string, string | number>) => {
    const q = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    return fetch(`${BASE}/api/employees?${q}`).then(async (r) => {
      const body = await r.json();
      if (!r.ok) throw new Error(body.error?.message ?? "Failed to load employees");
      return body as { data: Employee[]; meta: PageMeta };
    });
  },
  getEmployee: (id: string) => req<Employee & { salaryHistory: SalaryHistory[] }>(`/api/employees/${id}`),
  createEmployee: (input: Record<string, unknown>) => req<Employee>("/api/employees", { method: "POST", body: JSON.stringify(input) }),
  updateSalary: (id: string, newSalary: number, reason: string) =>
    req<{ employee: Employee; history: SalaryHistory }>(`/api/employees/${id}/salary`, { method: "PATCH", body: JSON.stringify({ newSalary, reason }) }),
  analytics: () => req<Analytics>("/api/analytics/summary"),
  exportUrl: (params: Record<string, string>) => `${BASE}/api/employees/export?${new URLSearchParams(params).toString()}`,
};
