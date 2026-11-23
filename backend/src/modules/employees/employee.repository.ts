import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { ListQuery } from "./employee.validation.js";
import type {
  EmployeeCreateData,
  EmployeeFilters,
  EmployeeRow,
  EmployeeWithHistory,
  SalaryHistoryRow,
  SalaryPoint,
} from "./employee.types.js";

// Pattern: Repository — services depend on this small interface, never on
// SQL or on a concrete class, so a new store needs no service change (SOLID
// Open/Closed + Dependency Inversion).
export interface EmployeeRepository {
  /** Paged, filtered, sorted employee list plus the un-paged total. */
  list(filters: EmployeeFilters, q: ListQuery): Promise<{ items: EmployeeRow[]; total: number }>;
  /** One employee with salary history, or null when the id does not exist. */
  getById(id: string): Promise<EmployeeWithHistory | null>;
  /** Insert an employee; rejects on a duplicate email (unique violation). */
  create(data: EmployeeCreateData): Promise<EmployeeRow>;
  /** Atomically set a salary and append a history row; null when id missing. */
  updateSalary(
    id: string,
    newSalary: number,
    reason: string,
    changedBy: string,
  ): Promise<{ employee: EmployeeRow; history: SalaryHistoryRow } | null>;
  /** Every employee's salary point, for analytics (no paging). */
  salaryPoints(): Promise<SalaryPoint[]>;
  /** Every employee matching the filters, for the CSV export. */
  allForExport(filters: EmployeeFilters): Promise<EmployeeRow[]>;
}

/**
 * Map one raw Postgres row (snake_case columns) to an EmployeeRow.
 * @param r Raw row from pg.
 * @returns The camelCase employee.
 */
function mapEmployee(r: Record<string, unknown>): EmployeeRow {
  return {
    id: r.id as string,
    firstName: r.first_name as string,
    lastName: r.last_name as string,
    email: r.email as string,
    department: r.department as string,
    country: r.country as string,
    currency: r.currency as string,
    jobTitle: r.job_title as string,
    level: r.level as string,
    managerId: (r.manager_id as string | null) ?? null,
    dateOfJoining: new Date(r.date_of_joining as string),
    employmentStatus: r.employment_status as string,
    baseSalary: Number(r.base_salary),
    createdAt: new Date(r.created_at as string),
    updatedAt: new Date(r.updated_at as string),
  };
}

/**
 * Map one raw salary_history row to a SalaryHistoryRow.
 * @param r Raw row from pg.
 * @returns The camelCase history row.
 */
function mapHistory(r: Record<string, unknown>): SalaryHistoryRow {
  return {
    id: r.id as string,
    employeeId: r.employee_id as string,
    oldSalary: Number(r.old_salary),
    newSalary: Number(r.new_salary),
    currency: r.currency as string,
    reason: r.reason as string,
    changedBy: r.changed_by as string,
    changedAt: new Date(r.changed_at as string),
  };
}

const COLS =
  "id, first_name, last_name, email, department, country, currency, job_title, level, manager_id, date_of_joining, employment_status, base_salary, created_at, updated_at";
/** Query sort keys the API accepts, mapped to real column names. */
const SORTABLE: Record<string, string> = {
  baseSalary: "base_salary",
  lastName: "last_name",
  dateOfJoining: "date_of_joining",
};

/**
 * Postgres implementation of EmployeeRepository — the only class that
 * knows SQL. All values are bound parameters; sort column/direction come
 * from the allow-listed SORTABLE map, never from raw user input.
 */
export class PgEmployeeRepository implements EmployeeRepository {
  /**
   * @param pool Postgres pool to run queries against.
   */
  constructor(private pool: Pool) {}

  /**
   * Build the WHERE clause for list/export filters, appending bound
   * values to `params` in placeholder order.
   * @param f Filters to apply.
   * @param params Bound values, extended in place.
   * @returns The WHERE clause, or "" when no filter is set.
   */
  private where(f: EmployeeFilters, params: unknown[]): string {
    const clauses: string[] = [];
    if (f.department) {
      params.push(f.department);
      clauses.push(`department = $${params.length}`);
    }
    if (f.country) {
      params.push(f.country);
      clauses.push(`country = $${params.length}`);
    }
    if (f.level) {
      params.push(f.level);
      clauses.push(`level = $${params.length}`);
    }
    if (f.search) {
      params.push(`%${f.search}%`);
      clauses.push(
        `(first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR email ILIKE $${params.length})`,
      );
    }
    return clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  }

  /**
   * List employees with filters, sorting and paging.
   * @param f Filters (department/country/level/search).
   * @param q Validated list query (sort, page, pageSize).
   * @returns The page of employees and the total matching count.
   */
  async list(f: EmployeeFilters, q: ListQuery): Promise<{ items: EmployeeRow[]; total: number }> {
    const params: unknown[] = [];
    const where = this.where(f, params);
    const sortCol = SORTABLE[q.sortBy] ?? "last_name";
    const sortDir = q.sortOrder === "desc" ? "DESC" : "ASC";
    const offset = (q.page - 1) * q.pageSize;
    const rows = await this.pool.query(
      `SELECT ${COLS} FROM employees ${where} ORDER BY ${sortCol} ${sortDir} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, q.pageSize, offset],
    );
    const total = await this.pool.query(
      `SELECT COUNT(*)::int AS c FROM employees ${where}`,
      params,
    );
    return { items: rows.rows.map(mapEmployee), total: total.rows[0].c as number };
  }

  /**
   * Fetch one employee plus their salary history (newest first).
   * @param id Employee UUID.
   * @returns The employee with history, or null when not found.
   */
  async getById(id: string): Promise<EmployeeWithHistory | null> {
    const e = await this.pool.query(`SELECT ${COLS} FROM employees WHERE id = $1`, [id]);
    if (e.rows.length === 0) return null;
    const h = await this.pool.query(
      "SELECT id, employee_id, old_salary, new_salary, currency, reason, changed_by, changed_at FROM salary_history WHERE employee_id = $1 ORDER BY changed_at DESC",
      [id],
    );
    return { ...mapEmployee(e.rows[0]), salaryHistory: h.rows.map(mapHistory) };
  }

  /**
   * Insert an employee. The database enforces the unique email; a
   * duplicate surfaces as a Postgres unique-violation error, which the
   * service maps to a 400.
   * @param data Employee fields (no id/timestamps/status).
   * @returns The inserted employee row.
   */
  async create(data: EmployeeCreateData): Promise<EmployeeRow> {
    const r = await this.pool.query(
      `INSERT INTO employees (id, first_name, last_name, email, department, country, currency, job_title, level, manager_id, date_of_joining, base_salary)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING ${COLS}`,
      [
        randomUUID(),
        data.firstName,
        data.lastName,
        data.email,
        data.department,
        data.country,
        data.currency,
        data.jobTitle,
        data.level,
        data.managerId,
        data.dateOfJoining,
        data.baseSalary,
      ],
    );
    return mapEmployee(r.rows[0]);
  }

  /**
   * Atomically update a salary and append its history row in one
   * transaction, locking the employee row so two concurrent updates
   * cannot interleave. Rolls back on any failure.
   * @param id Employee UUID.
   * @param newSalary New monthly base salary.
   * @param reason Why the salary changed (audit trail).
   * @param changedBy Who made the change.
   * @returns Updated employee + history row, or null when id is missing.
   */
  async updateSalary(
    id: string,
    newSalary: number,
    reason: string,
    changedBy: string,
  ): Promise<{ employee: EmployeeRow; history: SalaryHistoryRow } | null> {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const emp = await client.query(
        `SELECT ${COLS} FROM employees WHERE id = $1 FOR UPDATE`,
        [id],
      );
      if (emp.rows.length === 0) {
        await client.query("ROLLBACK");
        return null;
      }
      const current = mapEmployee(emp.rows[0]);
      const updated = await client.query(
        `UPDATE employees SET base_salary = $1, updated_at = now() WHERE id = $2 RETURNING ${COLS}`,
        [newSalary, id],
      );
      const hist = await client.query(
        `INSERT INTO salary_history (id, employee_id, old_salary, new_salary, currency, reason, changed_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, employee_id, old_salary, new_salary, currency, reason, changed_by, changed_at`,
        [randomUUID(), id, current.baseSalary, newSalary, current.currency, reason, changedBy],
      );
      await client.query("COMMIT");
      return { employee: mapEmployee(updated.rows[0]), history: mapHistory(hist.rows[0]) };
    } catch (e) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * All salary points for analytics.
   * @returns One point per employee.
   */
  async salaryPoints(): Promise<SalaryPoint[]> {
    const r = await this.pool.query(
      "SELECT department, country, level, base_salary, currency FROM employees",
    );
    return r.rows.map((x) => ({
      department: x.department as string,
      country: x.country as string,
      level: x.level as string,
      baseSalary: Number(x.base_salary),
      currency: x.currency as string,
    }));
  }

  /**
   * All employees matching the filters, ordered by last name, for export.
   * @param f Filters to apply.
   * @returns The matching employees (no paging).
   */
  async allForExport(f: EmployeeFilters): Promise<EmployeeRow[]> {
    const params: unknown[] = [];
    const where = this.where(f, params);
    const r = await this.pool.query(
      `SELECT ${COLS} FROM employees ${where} ORDER BY last_name ASC`,
      params,
    );
    return r.rows.map(mapEmployee);
  }
}

// Pattern: Repository — InMemoryEmployeeRepository is a second, swappable
// implementation of the same interface. Tests substitute it for Pg (SOLID
// Liskov: any EmployeeRepository works wherever the interface is expected),
// and no service code changes between the two.

/**
 * In-memory implementation of EmployeeRepository — used by unit/API tests,
 * no database needed. Mirrors the Postgres semantics, including the
 * unique-email rule (throws an error mentioning "unique").
 */
export class InMemoryEmployeeRepository implements EmployeeRepository {
  /** Seeded employees; tests assign this directly. */
  employees: EmployeeRow[] = [];
  /** Salary history rows, appended by updateSalary. */
  history: SalaryHistoryRow[] = [];

  /**
   * Apply department/country/level/search filters (AND) to a list.
   * Search is a case-insensitive substring over name + email, matching
   * the ILIKE behaviour of the Postgres implementation.
   * @param items Employees to filter.
   * @param f Filters to apply.
   * @returns The filtered employees.
   */
  private applyFilters(items: EmployeeRow[], f: EmployeeFilters): EmployeeRow[] {
    return items.filter(
      (e) =>
        (!f.department || e.department === f.department) &&
        (!f.country || e.country === f.country) &&
        (!f.level || e.level === f.level) &&
        (!f.search ||
          `${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(f.search.toLowerCase())),
    );
  }

  /**
   * List employees with filters, sorting and paging (same contract as Pg).
   * @param f Filters to apply.
   * @param q Validated list query (sort, page, pageSize).
   * @returns The page of employees and the total matching count.
   */
  async list(
    f: EmployeeFilters,
    q: ListQuery,
  ): Promise<{ items: EmployeeRow[]; total: number }> {
    const filtered = this.applyFilters(this.employees, f);
    const sorted = [...filtered].sort((a, b) => {
      const av = a[q.sortBy as keyof EmployeeRow] as string | number | Date;
      const bv = b[q.sortBy as keyof EmployeeRow] as string | number | Date;
      const c = av < bv ? -1 : av > bv ? 1 : 0;
      return q.sortOrder === "desc" ? -c : c;
    });
    return {
      items: sorted.slice((q.page - 1) * q.pageSize, q.page * q.pageSize),
      total: filtered.length,
    };
  }

  /**
   * Fetch one employee plus their salary history (newest first).
   * @param id Employee id.
   * @returns The employee with history, or null when not found.
   */
  async getById(id: string): Promise<EmployeeWithHistory | null> {
    const e = this.employees.find((x) => x.id === id);
    if (!e) return null;
    return {
      ...e,
      salaryHistory: this.history
        .filter((h) => h.employeeId === id)
        .sort((a, b) => +b.changedAt - +a.changedAt),
    };
  }

  /**
   * Insert an employee, rejecting a duplicate email like Postgres does.
   * @param data Employee fields (no id/timestamps/status).
   * @returns The inserted employee row.
   * @throws Error mentioning "unique" when the email already exists.
   */
  async create(data: EmployeeCreateData): Promise<EmployeeRow> {
    if (this.employees.some((x) => x.email === data.email)) {
      throw new Error(
        `duplicate key value violates unique constraint "employees_email_key"`,
      );
    }
    const e: EmployeeRow = {
      ...data,
      id: `test-${this.employees.length + 1}`,
      employmentStatus: "Active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.employees.push(e);
    return e;
  }

  /**
   * Update a salary and append a history row (atomic in memory: a single
   * synchronous mutation, so no partial state is observable).
   * @param id Employee id.
   * @param newSalary New monthly base salary.
   * @param reason Why the salary changed.
   * @param changedBy Who made the change.
   * @returns Updated employee + history row, or null when id is missing.
   */
  async updateSalary(
    id: string,
    newSalary: number,
    reason: string,
    changedBy: string,
  ): Promise<{ employee: EmployeeRow; history: SalaryHistoryRow } | null> {
    const e = this.employees.find((x) => x.id === id);
    if (!e) return null;
    const history: SalaryHistoryRow = {
      id: `h-${this.history.length + 1}`,
      employeeId: id,
      oldSalary: e.baseSalary,
      newSalary,
      currency: e.currency,
      reason,
      changedBy,
      changedAt: new Date(),
    };
    e.baseSalary = newSalary;
    e.updatedAt = new Date();
    this.history.push(history);
    return { employee: e, history };
  }

  /**
   * All salary points for analytics.
   * @returns One point per employee.
   */
  async salaryPoints(): Promise<SalaryPoint[]> {
    return this.employees.map((e) => ({
      department: e.department,
      country: e.country,
      level: e.level,
      baseSalary: e.baseSalary,
      currency: e.currency,
    }));
  }

  /**
   * All employees matching the filters, for export.
   * @param f Filters to apply.
   * @returns The matching employees (no paging).
   */
  async allForExport(f: EmployeeFilters): Promise<EmployeeRow[]> {
    return this.applyFilters(this.employees, f);
  }
}
