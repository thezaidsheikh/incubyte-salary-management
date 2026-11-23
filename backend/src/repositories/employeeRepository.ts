import { PrismaClient } from "@prisma/client";
import type { ListQuery } from "../validation/employee";

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

/** Prisma implementation — the only class that knows about the DB. */
export class PrismaEmployeeRepository implements EmployeeRepository {
  constructor(private prisma: PrismaClient) {}
  private where(f: EmployeeFilters) {
    return {
      ...(f.department ? { department: f.department } : {}),
      ...(f.country ? { country: f.country } : {}),
      ...(f.level ? { level: f.level as never } : {}),
      ...(f.search ? { OR: [
        { firstName: { contains: f.search, mode: "insensitive" as const } },
        { lastName: { contains: f.search, mode: "insensitive" as const } },
        { email: { contains: f.search, mode: "insensitive" as const } },
      ] } : {}),
    };
  }
  async list(f: EmployeeFilters, q: ListQuery) {
    const where = this.where(f);
    const [items, total] = await Promise.all([
      this.prisma.employee.findMany({ where, orderBy: { [q.sortBy]: q.sortOrder }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
      this.prisma.employee.count({ where }),
    ]);
    return { items: items as EmployeeRow[], total };
  }
  async getById(id: string) {
    const e = await this.prisma.employee.findUnique({ where: { id }, include: { salaryHistory: { orderBy: { changedAt: "desc" } } } });
    return e as (EmployeeRow & { salaryHistory: SalaryHistoryRow[] }) | null;
  }
  async create(data: Omit<EmployeeRow, "id" | "createdAt" | "updatedAt" | "employmentStatus">) {
    const e = await this.prisma.employee.create({ data: { ...data, dateOfJoining: new Date(data.dateOfJoining) } });
    return e as EmployeeRow;
  }
  async updateSalary(id: string, newSalary: number, reason: string, changedBy: string) {
    // Transaction: salary update + audit row succeed or fail together.
    return this.prisma.$transaction(async (tx) => {
      const emp = await tx.employee.findUnique({ where: { id } });
      if (!emp) return null;
      const employee = await tx.employee.update({ where: { id }, data: { baseSalary: newSalary } });
      const history = await tx.salaryHistory.create({ data: { employeeId: id, oldSalary: emp.baseSalary, newSalary, currency: emp.currency, reason, changedBy } });
      return { employee: employee as EmployeeRow, history: history as SalaryHistoryRow };
    });
  }
  async salaryPoints() {
    const rows = await this.prisma.employee.findMany({ select: { department: true, country: true, level: true, baseSalary: true, currency: true } });
    return rows;
  }
  async allForExport(f: EmployeeFilters) {
    const items = await this.prisma.employee.findMany({ where: this.where(f), orderBy: { lastName: "asc" } });
    return items as EmployeeRow[];
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
