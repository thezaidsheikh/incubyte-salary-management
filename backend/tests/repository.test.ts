import { describe, expect, it, beforeEach } from "vitest";
import { InMemoryEmployeeRepository } from "../src/modules/employees/employee.repository";
import { generateEmployees } from "../src/seed/seedData";
import type { ListQuery } from "../src/modules/employees/employee.validation";

function seededRepo() {
  const repo = new InMemoryEmployeeRepository();
  repo.employees = generateEmployees(50, 42).map((e, i) => ({
    ...e, id: `emp-${i}`, employmentStatus: "Active", createdAt: new Date(), updatedAt: new Date(),
  }));
  return repo;
}
const q = (over: Partial<ListQuery> = {}): ListQuery => ({ page: 1, pageSize: 20, sortBy: "lastName", sortOrder: "asc", ...over });

describe("InMemoryEmployeeRepository", () => {
  let repo: InMemoryEmployeeRepository;
  beforeEach(() => { repo = seededRepo(); });

  it("list: filters by department, country and level (AND)", async () => {
    const target = repo.employees[0];
    const { items, total } = await repo.list(
      { department: target.department, country: target.country, level: target.level }, q({ pageSize: 100 }),
    );
    expect(total).toBeGreaterThan(0);
    expect(items.every((e) => e.department === target.department && e.country === target.country && e.level === target.level)).toBe(true);
    const none = await repo.list({ department: "No Such Dept" }, q());
    expect(none).toEqual({ items: [], total: 0 });
  });
  it("list: search is case-insensitive over name and email", async () => {
    const target = repo.employees[0];
    const byName = await repo.list({ search: target.firstName.toUpperCase() }, q({ pageSize: 100 }));
    expect(byName.total).toBeGreaterThan(0);
    expect(byName.items.every((e) => `${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(target.firstName.toLowerCase()))).toBe(true);
    const byEmail = await repo.list({ search: target.email }, q());
    expect(byEmail.total).toBe(1);
    expect(await repo.list({ search: "zzz-no-match" }, q())).toEqual({ items: [], total: 0 });
  });
  it("list: sorts desc by baseSalary and by dateOfJoining", async () => {
    const desc = await repo.list({}, q({ sortBy: "baseSalary", sortOrder: "desc", pageSize: 100 }));
    const salaries = desc.items.map((e) => e.baseSalary);
    expect(salaries).toEqual([...salaries].sort((a, b) => b - a));
    const asc = await repo.list({}, q({ sortBy: "baseSalary", sortOrder: "asc", pageSize: 100 }));
    expect(asc.items[0].baseSalary).toBe(Math.min(...salaries));
    const byDate = await repo.list({}, q({ sortBy: "dateOfJoining", sortOrder: "desc", pageSize: 100 }));
    const dates = byDate.items.map((e) => +e.dateOfJoining);
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });
  it("list: page beyond the last returns empty items with the full total", async () => {
    const r = await repo.list({}, q({ page: 99, pageSize: 20 }));
    expect(r.items).toEqual([]);
    expect(r.total).toBe(50);
  });
  it("getById: returns the employee with history, null when missing", async () => {
    const emp = repo.employees[0];
    const found = await repo.getById(emp.id);
    expect(found?.email).toBe(emp.email);
    expect(found?.salaryHistory).toEqual([]);
    expect(await repo.getById("missing")).toBeNull();
  });
  it("create: assigns id/status/timestamps and rejects a duplicate email", async () => {
    const created = await repo.create({
      firstName: "Test", lastName: "User", email: "test.user@acme.com", department: "Engineering",
      country: "India", currency: "INR", jobTitle: "Engineer", level: "Junior",
      managerId: null, dateOfJoining: new Date("2023-01-01"), baseSalary: 50000,
    });
    expect(created.id).toBe("test-51");
    expect(created.employmentStatus).toBe("Active");
    await expect(repo.create({
      firstName: "Test", lastName: "User", email: "test.user@acme.com", department: "Engineering",
      country: "India", currency: "INR", jobTitle: "Engineer", level: "Junior",
      managerId: null, dateOfJoining: new Date("2023-01-01"), baseSalary: 50000,
    })).rejects.toThrow(/unique/i);
  });
  it("updateSalary: updates + history, null when missing, history newest-first", async () => {
    const emp = repo.employees[0];
    const original = emp.baseSalary;
    expect(await repo.updateSalary("missing", 1, "x", "HR")).toBeNull();
    const first = await repo.updateSalary(emp.id, original + 100, "Raise 1", "HR");
    expect(first?.history.oldSalary).toBe(original);
    expect(first?.history.newSalary).toBe(original + 100);
    // A second change a tick later must sort before the first.
    await new Promise((r) => setTimeout(r, 5));
    await repo.updateSalary(emp.id, original + 200, "Raise 2", "HR");
    const detail = await repo.getById(emp.id);
    expect(detail?.baseSalary).toBe(original + 200);
    expect(detail?.salaryHistory).toHaveLength(2);
    expect(detail?.salaryHistory[0].reason).toBe("Raise 2");
    expect(detail?.salaryHistory[1].reason).toBe("Raise 1");
  });
  it("salaryPoints: one point per employee; allForExport: filtered, unpaged", async () => {
    const points = await repo.salaryPoints();
    expect(points).toHaveLength(50);
    expect(points[0]).toEqual(expect.objectContaining({ department: expect.any(String), baseSalary: expect.any(Number) }));
    const target = repo.employees[0];
    const exported = await repo.allForExport({ department: target.department });
    expect(exported.length).toBeGreaterThan(0);
    expect(exported.every((e) => e.department === target.department)).toBe(true);
    expect((await repo.allForExport({})).length).toBe(50);
  });
});
