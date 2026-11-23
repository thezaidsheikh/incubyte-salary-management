import type { Analytics, Employee, PageMeta, SalaryHistory } from "./types";

export type { Analytics, Employee, PageMeta, SalaryHistory } from "./types";

/** Base URL of the salary-management backend (public env var, same default as before). */
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Error shape the backend wraps every failure in: `{ error: { message } }`. */
interface ErrorEnvelope {
  error?: { message?: string };
}

/**
 * Sends a JSON request and unwraps the backend's `{ data }` envelope.
 * Throws an Error carrying the envelope's message (or a status fallback)
 * when the response is not OK or the body is not JSON.
 */
async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = (await r.json().catch(() => ({}))) as ErrorEnvelope;
  if (!r.ok) throw new Error(body.error?.message ?? `Request failed (${r.status})`);
  return (body as unknown as { data: T }).data;
}

/** Typed client for every backend endpoint the UI uses. */
export const api = {
  /** Backend liveness probe. */
  health: () => req<{ status: string }>("/api/health"),

  /**
   * Lists employees with server-side search, filters, sorting and pagination.
   * Returns the rows plus pagination metadata.
   */
  listEmployees: (params: Record<string, string | number>) => {
    const q = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ).toString();
    return fetch(`${BASE}/api/employees?${q}`).then(async (r) => {
      const body = (await r.json()) as {
        data: Employee[];
        meta: PageMeta;
        error?: { message?: string };
      };
      if (!r.ok) throw new Error(body.error?.message ?? "Failed to load employees");
      return body as { data: Employee[]; meta: PageMeta };
    });
  },

  /** Fetches one employee together with their salary history. */
  getEmployee: (id: string) =>
    req<Employee & { salaryHistory: SalaryHistory[] }>(`/api/employees/${id}`),

  /** Creates a new employee; `input` is the form payload (salary already a number). */
  createEmployee: (input: Record<string, unknown>) =>
    req<Employee>("/api/employees", { method: "POST", body: JSON.stringify(input) }),

  /** Records a salary change; the backend appends it to the salary history. */
  updateSalary: (id: string, newSalary: number, reason: string) =>
    req<{ employee: Employee; history: SalaryHistory }>(`/api/employees/${id}/salary`, {
      method: "PATCH",
      body: JSON.stringify({ newSalary, reason }),
    }),

  /** Fetches the dashboard analytics summary. */
  analytics: () => req<Analytics>("/api/analytics/summary"),

  /** Builds the CSV-export URL for the current list filters. */
  exportUrl: (params: Record<string, string>) =>
    `${BASE}/api/employees/export?${new URLSearchParams(params).toString()}`,
};
