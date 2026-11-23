import { readFileSync } from "node:fs";
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import { createApp } from "../src/app";
import { createEmployeeModule } from "../src/modules/employees/index";
import { createSalaryModule } from "../src/modules/salary/index";
import { createAnalyticsModule } from "../src/modules/analytics/index";
import { InMemoryEmployeeRepository } from "../src/modules/employees/employee.repository";

// The module factories accept a Pool (production) or a repository
// (tests). These tests exercise the Pool branch: each factory builds its
// own PgEmployeeRepository over a real pg-mem pool.
describe("module factories with a Pool", () => {
  it("build working routers over pg-mem (migration applied)", async () => {
    const db = newDb();
    const { Pool } = db.adapters.createPg();
    const pool = new Pool() as unknown as import("pg").Pool;
    await pool.query(readFileSync(new URL("../migrations/001_init.sql", import.meta.url), "utf8"));

    const app = express();
    app.use(express.json());
    app.use("/api/employees", createEmployeeModule(pool).router);
    app.use("/api/employees", createSalaryModule(pool).router);
    app.use("/api/analytics", createAnalyticsModule(pool).router);

    const empty = await request(app).get("/api/employees");
    expect(empty.status).toBe(200);
    expect(empty.body.meta.total).toBe(0);
    const summary = await request(app).get("/api/analytics/summary");
    expect(summary.status).toBe(200);
    expect(summary.body.data.totalEmployees).toBe(0);
    const missing = await request(app)
      .patch("/api/employees/00000000-0000-0000-0000-000000000000/salary")
      .send({ newSalary: 100, reason: "Raise" });
    expect(missing.status).toBe(404);
    await pool.end();
  });

  it("factories also accept an injected repository", () => {
    const repo = new InMemoryEmployeeRepository();
    expect(createEmployeeModule(repo).service).toBeDefined();
    expect(createSalaryModule(repo).service).toBeDefined();
    expect(createAnalyticsModule(repo).service).toBeDefined();
  });

  it("createApp() with no repo uses the default pool; health still answers", async () => {
    // No database call happens for /api/health, so this works even
    // without DATABASE_URL set in the test environment.
    const app = createApp();
    const r = await request(app).get("/api/health");
    expect(r.status).toBe(200);
    expect(r.body.data.status).toBe("ok");
  });
});
