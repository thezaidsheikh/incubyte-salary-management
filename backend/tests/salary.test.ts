import { describe, expect, it, beforeEach } from "vitest";
import { InMemoryEmployeeRepository } from "../src/modules/employees/employee.repository";
import { EmployeeService } from "../src/modules/employees/employee.service";
import { SalaryService } from "../src/modules/salary/salary.service";
import { generateEmployees } from "../src/seed/seedData";

function seededRepo() {
  const repo = new InMemoryEmployeeRepository();
  repo.employees = generateEmployees(5, 42).map((e, i) => ({
    ...e, id: `emp-${i}`, employmentStatus: "Active", createdAt: new Date(), updatedAt: new Date(),
  }));
  return repo;
}

describe("SalaryService", () => {
  let repo: InMemoryEmployeeRepository;
  let service: SalaryService;
  beforeEach(() => {
    repo = seededRepo();
    service = new SalaryService(repo);
  });

  it("updates the salary and records history with the default changedBy", async () => {
    const emp = repo.employees[0];
    const original = emp.baseSalary;
    const { employee, history } = await service.updateSalary(emp.id, { newSalary: original + 5000, reason: "Annual appraisal" });
    expect(employee.baseSalary).toBe(original + 5000);
    expect(history.oldSalary).toBe(original);
    expect(history.newSalary).toBe(original + 5000);
    expect(history.reason).toBe("Annual appraisal");
    expect(history.changedBy).toBe("HR Manager");
    expect((await repo.getById(emp.id))?.salaryHistory).toHaveLength(1);
  });
  it("keeps an explicit changedBy", async () => {
    const emp = repo.employees[0];
    const { history } = await service.updateSalary(emp.id, { newSalary: emp.baseSalary + 1, reason: "Market correction", changedBy: "Zaid Qureshi" });
    expect(history.changedBy).toBe("Zaid Qureshi");
  });
  it("rejects a salary equal to the current one (400)", async () => {
    const emp = repo.employees[0];
    await expect(service.updateSalary(emp.id, { newSalary: emp.baseSalary, reason: "No change" })).rejects.toMatchObject({
      status: 400, message: "newSalary must differ from the current salary",
    });
    expect((await repo.getById(emp.id))?.salaryHistory).toHaveLength(0);
  });
  it("404s for an unknown employee", async () => {
    await expect(service.updateSalary("missing", { newSalary: 99999, reason: "Raise" })).rejects.toMatchObject({
      status: 404, message: "Employee not found",
    });
  });
  it("404s when the employee vanishes between load and update", async () => {
    // Race guard: getById finds them, updateSalary then reports missing.
    const vanishing = {
      list: async () => ({ items: [], total: 0 }),
      getById: async () => ({ ...repo.employees[0], salaryHistory: [] }),
      create: async () => repo.employees[0],
      updateSalary: async () => null,
      salaryPoints: async () => [],
      allForExport: async () => [],
    };
    const racing = new SalaryService(vanishing as unknown as import("../src/modules/employees/employee.repository").EmployeeRepository);
    await expect(racing.updateSalary("emp-0", { newSalary: 99999, reason: "Raise" })).rejects.toMatchObject({
      status: 404, message: "Employee not found",
    });
  });
});

describe("EmployeeService", () => {
  it("create: duplicate email -> 400, other errors rethrown", async () => {
    const repo = seededRepo();
    const service = new EmployeeService(repo);
    const existing = repo.employees[0];
    await expect(service.create({
      firstName: "New", lastName: "Person", email: existing.email, department: "Engineering",
      country: "India", currency: "INR", jobTitle: "Engineer", level: "Senior",
      dateOfJoining: "2022-01-01", baseSalary: 100000,
    })).rejects.toMatchObject({ status: 400, message: "An employee with this email already exists" });
  });
  it("create: non-unique repository errors are rethrown, not mapped to 400", async () => {
    const failingRepo = {
      list: async () => ({ items: [], total: 0 }),
      getById: async () => null,
      create: async () => { throw new Error("database is down"); },
      updateSalary: async () => null,
      salaryPoints: async () => [],
      allForExport: async () => [],
    };
    const service = new EmployeeService(failingRepo as unknown as import("../src/modules/employees/employee.repository").EmployeeRepository);
    await expect(service.create({
      firstName: "New", lastName: "Person", email: "new@acme.com", department: "Engineering",
      country: "India", currency: "INR", jobTitle: "Engineer", level: "Senior",
      dateOfJoining: "2022-01-01", baseSalary: 100000,
    })).rejects.toThrow("database is down");
  });
  it("getById: 404 for unknown id; list: meta matches repo totals", async () => {
    const repo = seededRepo();
    const service = new EmployeeService(repo);
    await expect(service.getById("missing")).rejects.toMatchObject({ status: 404 });
    const page = await service.list({ page: 1, pageSize: 2, sortBy: "lastName", sortOrder: "asc" });
    expect(page.data).toHaveLength(2);
    expect(page.meta).toEqual({ total: 5, page: 1, pageSize: 2, totalPages: 3 });
  });
});
