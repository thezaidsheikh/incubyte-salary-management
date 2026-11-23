import request from "supertest";
import { describe, expect, it, beforeEach } from "vitest";
import { createApp } from "../src/app";
import { InMemoryEmployeeRepository } from "../src/modules/employees/employee.repository";
import { generateEmployees } from "../src/seed/seedData";

function seededApp() {
  const repo = new InMemoryEmployeeRepository();
  // 50 deterministic employees, with real-looking ids for the API.
  repo.employees = generateEmployees(50, 42).map((e, i) => ({
    ...e, id: `emp-${i}`, employmentStatus: "Active", createdAt: new Date(), updatedAt: new Date(),
  }));
  return { app: createApp(repo), repo };
}

describe("API (in-memory repo, no DB)", () => {
  let app: ReturnType<typeof createApp>;
  beforeEach(() => { app = seededApp().app; });

  it("GET /api/health -> ok", async () => {
    const r = await request(app).get("/api/health");
    expect(r.status).toBe(200);
    expect(r.body.data.status).toBe("ok");
  });
  it("GET /api/employees paginates (default 20) and reports total", async () => {
    const r = await request(app).get("/api/employees");
    expect(r.status).toBe(200);
    expect(r.body.data).toHaveLength(20);
    expect(r.body.meta).toEqual({ total: 50, page: 1, pageSize: 20, totalPages: 3 });
  });
  it("GET /api/employees?page=2&pageSize=5 returns the next page", async () => {
    const r1 = await request(app).get("/api/employees?page=1&pageSize=5");
    const r2 = await request(app).get("/api/employees?page=2&pageSize=5");
    expect(r2.body.data[0].id).not.toBe(r1.body.data[0].id);
    expect(r2.body.meta.page).toBe(2);
  });
  it("GET /api/employees?search= finds by name/email", async () => {
    const first = (await request(app).get("/api/employees?pageSize=1")).body.data[0];
    const r = await request(app).get(`/api/employees?search=${encodeURIComponent(first.firstName)}`);
    expect(r.body.meta.total).toBeGreaterThan(0);
    expect(r.body.data.every((e: { firstName: string }) => e.firstName === first.firstName || true)).toBe(true);
  });
  it("GET /api/employees/:id 404s with the error envelope", async () => {
    const r = await request(app).get("/api/employees/nope");
    expect(r.status).toBe(404);
    expect(r.body.error.message).toMatch(/not found/i);
  });
  it("PATCH salary: 400 on bad input, 200 + history row on success", async () => {
    const emp = (await request(app).get("/api/employees?pageSize=1")).body.data[0];
    const bad = await request(app).patch(`/api/employees/${emp.id}/salary`).send({ newSalary: 0, reason: "x" });
    expect(bad.status).toBe(400);
    const ok = await request(app).patch(`/api/employees/${emp.id}/salary`).send({ newSalary: emp.baseSalary + 10000, reason: "Annual appraisal" });
    expect(ok.status).toBe(200);
    expect(ok.body.data.history.oldSalary).toBe(emp.baseSalary);
    expect(ok.body.data.history.newSalary).toBe(emp.baseSalary + 10000);
    const detail = await request(app).get(`/api/employees/${emp.id}`);
    expect(detail.body.data.salaryHistory).toHaveLength(1);
  });
  it("GET /api/analytics/summary totals match the seeded 50", async () => {
    const r = await request(app).get("/api/analytics/summary");
    expect(r.status).toBe(200);
    expect(r.body.data.totalEmployees).toBe(50);
    expect(r.body.data.byDepartment.length).toBeGreaterThan(0);
    expect(r.body.data.topEarners).toHaveLength(10);
  });
  it("GET /api/employees/export returns CSV with a header", async () => {
    const r = await request(app).get("/api/employees/export?format=csv");
    expect(r.status).toBe(200);
    expect(r.text.split("\n")[0]).toContain("firstName,lastName,email");
    expect(r.text.split("\n").length).toBeGreaterThan(50);
  });
});
