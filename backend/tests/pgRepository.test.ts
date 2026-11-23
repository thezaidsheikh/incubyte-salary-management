import { readFileSync } from "node:fs";
import { describe, expect, it, beforeAll } from "vitest";
import { newDb } from "pg-mem";
import { PgEmployeeRepository } from "../src/modules/employees/employee.repository";
import type { ListQuery } from "../src/modules/employees/employee.validation";

// Live-SQL coverage of the Postgres repository without a server: the real
// migration runs in pg-mem, then every repository method is exercised.
describe("PgEmployeeRepository (pg-mem, real migration)", () => {
  let repo: PgEmployeeRepository;

  beforeAll(async () => {
    const db = newDb();
    const { Pool } = db.adapters.createPg();
    const pool = new Pool() as unknown as import("pg").Pool;
    const migration = readFileSync(new URL("../migrations/001_init.sql", import.meta.url), "utf8");
    await pool.query(migration);
    repo = new PgEmployeeRepository(pool);
  });

  const q = (over: Partial<ListQuery> = {}): ListQuery => ({ page: 1, pageSize: 20, sortBy: "lastName", sortOrder: "asc", ...over });
  const priya = {
    firstName: "Priya", lastName: "Sharma", email: "priya.sharma@acme.com", department: "Engineering",
    country: "India", currency: "INR", jobTitle: "Software Engineer", level: "Senior",
    managerId: null, dateOfJoining: new Date("2022-03-01"), baseSalary: 150000,
  };

  it("create + getById round-trip, null when missing", async () => {
    const created = await repo.create(priya);
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.employmentStatus).toBe("Active");
    expect(created.dateOfJoining.toISOString().slice(0, 10)).toBe("2022-03-01");
    const found = await repo.getById(created.id);
    expect(found?.email).toBe("priya.sharma@acme.com");
    expect(found?.salaryHistory).toEqual([]);
    expect(await repo.getById("00000000-0000-0000-0000-000000000000")).toBeNull();
  });
  it("create rejects a duplicate email (unique violation)", async () => {
    await expect(repo.create(priya)).rejects.toThrow(/unique/i);
  });
  it("list filters, sorts desc, and pages", async () => {
    await repo.create({ ...priya, firstName: "Rahul", lastName: "Verma", email: "rahul.verma@acme.com", baseSalary: 90000, level: "Mid" });
    const eng = await repo.list({ department: "Engineering" }, q({ pageSize: 100 }));
    expect(eng.total).toBe(2);
    const none = await repo.list({ department: "Nope" }, q());
    expect(none).toEqual({ items: [], total: 0 });
    const bySalary = await repo.list({}, q({ sortBy: "baseSalary", sortOrder: "desc" }));
    expect(bySalary.items[0].baseSalary).toBe(150000);
    expect(bySalary.items[1].baseSalary).toBe(90000);
    const search = await repo.list({ search: "rahul" }, q());
    expect(search.total).toBe(1);
    expect(search.items[0].email).toBe("rahul.verma@acme.com");
    const byLevelCountry = await repo.list({ level: "Senior", country: "India" }, q());
    expect(byLevelCountry.total).toBe(1);
    expect(byLevelCountry.items[0].email).toBe("priya.sharma@acme.com");
    const byLevelOnly = await repo.list({ level: "Mid" }, q());
    expect(byLevelOnly.total).toBe(1);
    // Unknown sort key falls back to last_name (defensive; the API schema
    // only allows the three known keys, so this is reachable only directly).
    const unknownSort = await repo.list({}, q({ sortBy: "email" as unknown as ListQuery["sortBy"] }));
    expect(unknownSort.total).toBe(2);
    expect(unknownSort.items[0].lastName).toBe("Sharma");
    const page2 = await repo.list({}, q({ page: 2, pageSize: 1 }));
    expect(page2.items).toHaveLength(1);
    expect(page2.total).toBe(2);
  });
  it("updateSalary is atomic with history; null when missing", async () => {
    expect(await repo.updateSalary("00000000-0000-0000-0000-000000000000", 1, "x", "HR")).toBeNull();
    const { items } = await repo.list({ search: "priya.sharma" }, q());
    const id = items[0].id;
    const { employee, history } = (await repo.updateSalary(id, 180000, "Annual appraisal", "HR Manager"))!;
    expect(employee.baseSalary).toBe(180000);
    expect(history.oldSalary).toBe(150000);
    expect(history.newSalary).toBe(180000);
    expect(history.reason).toBe("Annual appraisal");
    const detail = await repo.getById(id);
    expect(detail?.salaryHistory).toHaveLength(1);
    expect(detail?.salaryHistory[0].newSalary).toBe(180000);
  });
  it("updateSalary rolls back and rethrows when the update fails", async () => {
    // Fake pool: SELECT finds the employee, UPDATE throws mid-transaction.
    const row = {
      id: "00000000-0000-0000-0000-000000000001", first_name: "Priya", last_name: "Sharma",
      email: "priya@acme.com", department: "Engineering", country: "India", currency: "INR",
      job_title: "Engineer", level: "Senior", manager_id: null, date_of_joining: "2022-03-01",
      employment_status: "Active", base_salary: 100, created_at: new Date(), updated_at: new Date(),
    };
    let released = false;
    const release = () => { released = true; };
    const client = {
      query: async (sql: string) => {
        if (sql.startsWith("UPDATE")) throw new Error("connection lost mid-transaction");
        // Even the ROLLBACK fails: the `.catch(() => undefined)` arm must swallow it.
        if (sql.startsWith("ROLLBACK")) throw new Error("rollback failed too");
        if (sql.startsWith("SELECT")) return { rows: [row] };
        return { rows: [] };
      },
      release,
    };
    const fakePool = { connect: async () => client } as unknown as import("pg").Pool;
    const failing = new PgEmployeeRepository(fakePool);
    await expect(failing.updateSalary(row.id, 200, "Raise", "HR")).rejects.toThrow("connection lost");
    expect(released).toBe(true); // finally always releases the client, even on failure
  });
  it("salaryPoints and allForExport return all rows", async () => {
    const points = await repo.salaryPoints();
    expect(points).toHaveLength(2);
    expect(points[0]).toEqual(expect.objectContaining({ department: "Engineering", currency: "INR" }));
    expect((await repo.allForExport({})).length).toBe(2);
    expect((await repo.allForExport({ country: "India" })).length).toBe(2);
    expect((await repo.allForExport({ country: "USA" })).length).toBe(0);
  });
});
