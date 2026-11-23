import request from "supertest";
import { describe, expect, it, beforeEach } from "vitest";
import { createApp } from "../src/app";
import { InMemoryEmployeeRepository } from "../src/modules/employees/employee.repository";
import { generateEmployees } from "../src/seed/seedData";

function seededApp(count = 50) {
  const repo = new InMemoryEmployeeRepository();
  repo.employees = generateEmployees(count, 42).map((e, i) => ({
    ...e, id: `emp-${i}`, employmentStatus: "Active", createdAt: new Date(), updatedAt: new Date(),
  }));
  return { app: createApp(repo), repo };
}

const newEmployee = {
  firstName: "Asha", lastName: "Nair", email: "asha.nair@acme.com",
  department: "Engineering", country: "India", currency: "INR",
  jobTitle: "Software Engineer", level: "Senior", dateOfJoining: "2022-03-01", baseSalary: 150000,
};

describe("app routes", () => {
  let app: ReturnType<typeof createApp>;
  beforeEach(() => { app = seededApp().app; });

  it("unknown route -> 404 NOT_FOUND envelope", async () => {
    const r = await request(app).get("/api/nope");
    expect(r.status).toBe(404);
    expect(r.body).toEqual({ error: { code: "NOT_FOUND", message: "Route not found" } });
    const r2 = await request(app).get("/nope");
    expect(r2.status).toBe(404);
  });
  it("POST create: 201 + employee; duplicate email -> 400", async () => {
    const ok = await request(app).post("/api/employees").send(newEmployee);
    expect(ok.status).toBe(201);
    expect(ok.body.data.email).toBe("asha.nair@acme.com");
    expect(ok.body.data.employmentStatus).toBe("Active");
    const dup = await request(app).post("/api/employees").send(newEmployee);
    expect(dup.status).toBe(400);
    expect(dup.body.error.code).toBe("API_ERROR");
    expect(dup.body.error.message).toMatch(/already exists/i);
  });
  it("POST create: validation errors -> 400 with field details", async () => {
    const r = await request(app).post("/api/employees").send({ ...newEmployee, email: "bad", level: "Intern", baseSalary: -1 });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("API_ERROR");
    expect(r.body.error.message).toBe("Validation failed");
    expect(r.body.error.details.map((d: { field: string }) => d.field).sort()).toEqual(["baseSalary", "email", "level"]);
  });
  it("pagination edges: page 0 -> 400, pageSize 100 ok, 101 -> 400, beyond last -> empty + meta", async () => {
    expect((await request(app).get("/api/employees?page=0")).status).toBe(400);
    expect((await request(app).get("/api/employees?pageSize=101")).status).toBe(400);
    expect((await request(app).get("/api/employees?sortBy=email")).status).toBe(400);
    const hundred = await request(app).get("/api/employees?pageSize=100");
    expect(hundred.status).toBe(200);
    expect(hundred.body.data).toHaveLength(50);
    expect(hundred.body.meta.totalPages).toBe(1);
    const beyond = await request(app).get("/api/employees?page=99&pageSize=20");
    expect(beyond.status).toBe(200);
    expect(beyond.body.data).toEqual([]);
    expect(beyond.body.meta).toEqual({ total: 50, page: 99, pageSize: 20, totalPages: 3 });
  });
  it("PATCH salary errors: negative/zero, missing reason, same salary, unknown employee", async () => {
    const emp = (await request(app).get("/api/employees?pageSize=1")).body.data[0];
    expect((await request(app).patch(`/api/employees/${emp.id}/salary`).send({ newSalary: -5, reason: "Raise" })).status).toBe(400);
    expect((await request(app).patch(`/api/employees/${emp.id}/salary`).send({ newSalary: 0, reason: "Raise" })).status).toBe(400);
    expect((await request(app).patch(`/api/employees/${emp.id}/salary`).send({ newSalary: 99999 })).status).toBe(400);
    const same = await request(app).patch(`/api/employees/${emp.id}/salary`).send({ newSalary: emp.baseSalary, reason: "No change really" });
    expect(same.status).toBe(400);
    expect(same.body.error.message).toMatch(/must differ/);
    const missing = await request(app).patch("/api/employees/nope/salary").send({ newSalary: 99999, reason: "Raise" });
    expect(missing.status).toBe(404);
    expect(missing.body.error.message).toMatch(/not found/i);
  });
  it("GET /api/analytics/summary on an empty repo: zeros, no crash", async () => {
    const empty = createApp(new InMemoryEmployeeRepository());
    const r = await request(empty).get("/api/analytics/summary");
    expect(r.status).toBe(200);
    expect(r.body.data.totalEmployees).toBe(0);
    expect(r.body.data.averageSalaryUsd).toBe(0);
    expect(r.body.data.topEarners).toEqual([]);
  });
  it("GET export on an empty repo: header only, no data rows", async () => {
    const empty = createApp(new InMemoryEmployeeRepository());
    const r = await request(empty).get("/api/employees/export?format=csv");
    expect(r.status).toBe(200);
    expect(r.headers["content-type"]).toMatch(/text\/csv/);
    expect(r.text).toBe("id,firstName,lastName,email,department,country,currency,jobTitle,level,baseSalary,dateOfJoining\n");
  });
  it("GET export streams in pages: 1,000 rows uses the second page", async () => {
    const big = seededApp(1000).app;
    const r = await request(big).get("/api/employees/export?format=csv");
    expect(r.status).toBe(200);
    const lines = r.text.split("\n");
    // header + 1,000 data rows + trailing newline
    expect(lines.length).toBe(1002);
    expect(lines[0]).toContain("firstName,lastName,email");
    expect(lines[1000]).toContain("@acme.com");
  });
  it("GET export with a filter exports only matching rows", async () => {
    const target = (await request(app).get("/api/employees?pageSize=1")).body.data[0];
    const r = await request(app).get(`/api/employees/export?department=${encodeURIComponent(target.department)}`);
    expect(r.status).toBe(200);
    const lines = r.text.trim().split("\n");
    expect(lines[0]).toContain("firstName,lastName,email");
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.slice(1).every((l) => l.split(",")[4] === target.department)).toBe(true);
  });
  it("GET /api/employees/:id returns the employee with empty history", async () => {
    const emp = (await request(app).get("/api/employees?pageSize=1")).body.data[0];
    const r = await request(app).get(`/api/employees/${emp.id}`);
    expect(r.status).toBe(200);
    expect(r.body.data.id).toBe(emp.id);
    expect(r.body.data.salaryHistory).toEqual([]);
  });
  it("list filters: department + level + sort desc work over HTTP", async () => {
    const r = await request(app).get("/api/employees?department=Engineering&sortBy=baseSalary&sortOrder=desc&pageSize=100");
    expect(r.status).toBe(200);
    expect(r.body.meta.total).toBeGreaterThan(0);
    expect(r.body.data.every((e: { department: string }) => e.department === "Engineering")).toBe(true);
    const salaries = r.body.data.map((e: { baseSalary: number }) => e.baseSalary);
    expect(salaries).toEqual([...salaries].sort((a, b) => b - a));
  });
});
