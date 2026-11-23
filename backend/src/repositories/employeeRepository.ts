import type { Pool, PoolClient } from "pg";
import type { ListQuery } from "../validation/employee.js";

export interface EmployeeRow {
  id: string; firstName: string; lastName: string; email: string;
  department: string; country: string; currency: string; jobTitle: string;
  level: string; managerId: string | null; dateOfJoining: Date;
  employmentStatus: string; baseSalary: number; createdAt: Date; updatedAt: Date;
}
export interface SalaryHistoryRow {
  id: string; employeeId: string; oldSalary: number; newSalary: number;
  currency: string; reason: string; changedBy: string; changedAt: Date;
}
export interface EmployeeFilters { search?: string; department?: string; country?: string; level?: string }
export interface SalaryPoint { department: string; country: string; level: string; baseSalary: number; currency: string }

export interface EmployeeRepository {
  list(filters: EmployeeFilters, q: ListQuery): Promise<{ items: EmployeeRow[]; total: number }>;
  getById(id: string): Promise<(EmployeeRow & { salaryHistory: SalaryHistoryRow[] }) | null>;
  create(data: Omit<EmployeeRow, "id" | "createdAt" | "updatedAt" | "employmentStatus">): Promise<EmployeeRow>;
  updateSalary(id: string, newSalary: number, reason: string, changedBy: string): Promise<{ employee: EmployeeRow; history: SalaryHistoryRow } | null>;
  salaryPoints(): Promise<SalaryPoint[]>;
  allForExport(filters: EmployeeFilters): Promise<EmployeeRow[]>;
}

function mapEmployee(r: Record<string, unknown>): EmployeeRow {
  return {
    id: r.id as string, firstName: r.first_name as string, lastName: r.last_name as string,
    email: r.email as string, department: r.department as string, country: r.country as string,
    currency: r.currency as string, jobTitle: r.job_title as string, level: r.level as string,
    managerId: (r.manager_id as string | null) ?? null,
    dateOfJoining: new Date(r.date_of_joining as string),
    employmentStatus: r.employment_status as string, baseSalary: Number(r.base_salary),
    createdAt: new Date(r.created_at as string), updatedAt: new Date(r.updated_at as string),
  };
}
function mapHistory(r: Record<string, unknown>): SalaryHistoryRow {
  return {
    id: r.id as string, employeeId: r.employee_id as string, oldSalary: Number(r.old_salary),
    newSalary: Number(r.new_salary), currency: r.currency as string, reason: r.reason as string,
    changedBy: r.changed_by as string, changedAt: new Date(r.changed_at as string),
  };
}
const COLS = "id, first_name, last_name, email, department, country, currency, job_title, level, manager_id, date_of_joining, employment_status, base_salary, created_at, updated_at";
const SORTABLE: Record<string, string> = { baseSalary: "base_salary", lastName: "last_name", dateOfJoining: "date_of_joining" };

/** pg implementation — the only class that knows SQL. */
export class PgEmployeeRepository implements EmployeeRepository {
  constructor(private pool: Pool) {}
  private where(f: EmployeeFilters, params: unknown[]): string {
    const clauses: string[] = [];
    if (f.department) { params.push(f.department); clauses.push(`department = $${params.length}`); }
    if (f.country) { params.push(f.country); clauses.push(`country = $${params.length}`); }
    if (f.level) { params.push(f.level); clauses.push(`level = $${params.length}`); }
    if (f.search) { params.push(`%${f.search}%`); clauses.push(`(first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR email ILIKE $${params.length})`); }
    return clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  }
  async list(f: EmployeeFilters, q: ListQuery) {
    const params: unknown[] = [];
    const where = this.where(f, params);
    const sortCol = SORTABLE[q.sortBy] ?? "last_name";
    const sortDir = q.sortOrder === "desc" ? "DESC" : "ASC";
    const offset = (q.page - 1) * q.pageSize;
    const rows = await this.pool.query(
      `SELECT ${COLS} FROM employees ${where} ORDER BY ${sortCol} ${sortDir} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, q.pageSize, offset]);
    const total = await this.pool.query(`SELECT COUNT(*)::int AS c FROM employees ${where}`, params);
    return { items: rows.rows.map(mapEmployee), total: total.rows[0].c as number };
  }
  async getById(id: string) {
    const e = await this.pool.query(`SELECT ${COLS} FROM employees WHERE id = $1`, [id]);
    if (e.rows.length === 0) return null;
    const h = await this.pool.query(
      "SELECT id, employee_id, old_salary, new_salary, currency, reason, changed_by, changed_at FROM salary_history WHERE employee_id = $1 ORDER BY changed_at DESC", [id]);
    return { ...mapEmployee(e.rows[0]), salaryHistory: h.rows.map(mapHistory) };
  }
  async create(data: Omit<EmployeeRow, "id" | "createdAt" | "updatedAt" | "employmentStatus">) {
    const { randomUUID } = await import("node:crypto");
    const r = await this.pool.query(
      `INSERT INTO employees (id, first_name, last_name, email, department, country, currency, job_title, level, manager_id, date_of_joining, base_salary)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING ${COLS}`,
      [randomUUID(), data.firstName, data.lastName, data.email, data.department, data.country, data.currency, data.jobTitle, data.level, data.managerId, data.dateOfJoining, data.baseSalary]);
    return mapEmployee(r.rows[0]);
  }
  async updateSalary(id: string, newSalary: number, reason: string, changedBy: string) {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const emp = await client.query(`SELECT ${COLS} FROM employees WHERE id = $1 FOR UPDATE`, [id]);
      if (emp.rows.length === 0) { await client.query("ROLLBACK"); return null; }
      const current = mapEmployee(emp.rows[0]);
      const { randomUUID } = await import("node:crypto");
      const updated = await client.query(
        `UPDATE employees SET base_salary = $1, updated_at = now() WHERE id = $2 RETURNING ${COLS}`, [newSalary, id]);
      const hist = await client.query(
        `INSERT INTO salary_history (id, employee_id, old_salary, new_salary, currency, reason, changed_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, employee_id, old_salary, new_salary, currency, reason, changed_by, changed_at`,
        [randomUUID(), id, current.baseSalary, newSalary, current.currency, reason, changedBy]);
      await client.query("COMMIT");
      return { employee: mapEmployee(updated.rows[0]), history: mapHistory(hist.rows[0]) };
    } catch (e) { await client.query("ROLLBACK").catch(() => undefined); throw e; }
    finally { client.release(); }
  }
  async salaryPoints() {
    const r = await this.pool.query("SELECT department, country, level, base_salary, currency FROM employees");
    return r.rows.map((x) => ({ department: x.department as string, country: x.country as string, level: x.level as string, baseSalary: Number(x.base_salary), currency: x.currency as string }));
  }
  async allForExport(f: EmployeeFilters) {
    const params: unknown[] = [];
    const where = this.where(f, params);
    const r = await this.pool.query(`SELECT ${COLS} FROM employees ${where} ORDER BY last_name ASC`, params);
    return r.rows.map(mapEmployee);
  }
}

/** In-memory implementation — used by unit/API tests, no DB needed. */
export class InMemoryEmployeeRepository implements EmployeeRepository {
  employees: EmployeeRow[] = [];
  history: SalaryHistoryRow[] = [];
  private applyFilters(items: EmployeeRow[], f: EmployeeFilters) {
    return items.filter((e) =>
      (!f.department || e.department === f.department) &&
      (!f.country || e.country === f.country) &&
      (!f.level || e.level === f.level) &&
      (!f.search || `${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(f.search.toLowerCase())));
  }
  async list(f: EmployeeFilters, q: ListQuery) {
    const filtered = this.applyFilters(this.employees, f);
    const sorted = [...filtered].sort((a, b) => {
      const av = a[q.sortBy as keyof EmployeeRow] as string | number;
      const bv = b[q.sortBy as keyof EmployeeRow] as string | number;
      const c = av < bv ? -1 : av > bv ? 1 : 0;
      return q.sortOrder === "desc" ? -c : c;
    });
    return { items: sorted.slice((q.page - 1) * q.pageSize, q.page * q.pageSize), total: filtered.length };
  }
  async getById(id: string) {
    const e = this.employees.find((x) => x.id === id);
    if (!e) return null;
    return { ...e, salaryHistory: this.history.filter((h) => h.employeeId === id).sort((a, b) => +b.changedAt - +a.changedAt) };
  }
  async create(data: Omit<EmployeeRow, "id" | "createdAt" | "updatedAt" | "employmentStatus">) {
    const e: EmployeeRow = { ...data, id: `test-${this.employees.length + 1}`, employmentStatus: "Active", createdAt: new Date(), updatedAt: new Date() };
    this.employees.push(e);
    return e;
  }
  async updateSalary(id: string, newSalary: number, reason: string, changedBy: string) {
    const e = this.employees.find((x) => x.id === id);
    if (!e) return null;
    const history: SalaryHistoryRow = { id: `h-${this.history.length + 1}`, employeeId: id, oldSalary: e.baseSalary, newSalary, currency: e.currency, reason, changedBy, changedAt: new Date() };
    e.baseSalary = newSalary; e.updatedAt = new Date();
    this.history.push(history);
    return { employee: e, history };
  }
  async salaryPoints() { return this.employees.map((e) => ({ department: e.department, country: e.country, level: e.level, baseSalary: e.baseSalary, currency: e.currency })); }
  async allForExport(f: EmployeeFilters) { return this.applyFilters(this.employees, f); }
}
