// Live-SQL verification without a Postgres server: runs the real migration
// + seed + HTTP smoke test against pg-mem (pg-compatible, in-memory).
// Usage: npx tsx scripts/verify-pgmem.ts
import { readFileSync } from "node:fs";
import { newDb } from "pg-mem";
import { generateEmployees } from "../src/utils/seedData.js";
import { createApp } from "../src/app.js";
import { PgEmployeeRepository } from "../src/repositories/employeeRepository.js";

async function main() {
  const started = Date.now();
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  const pool = new Pool() as unknown as import("pg").Pool;
  const migration = readFileSync(new URL("../migrations/001_init.sql", import.meta.url), "utf8");
  await pool.query(migration);
  console.log("migration: ok");

  const employees = generateEmployees(10_000, 42);
  const { randomUUID } = await import("node:crypto");
  const ids = employees.map(() => randomUUID());
  const BATCH = 1000;
  for (let i = 0; i < employees.length; i += BATCH) {
    const batch = employees.slice(i, i + BATCH);
    const values: unknown[] = [];
    const placeholders = batch.map((e, j) => {
      const o = j * 12;
      values.push(ids[i + j], e.firstName, e.lastName, e.email, e.department, e.country, e.currency, e.jobTitle, e.level,
        e.managerId ? ids[Number(e.managerId.replace("emp-", ""))] : null, e.dateOfJoining, e.baseSalary);
      return `($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5},$${o + 6},$${o + 7},$${o + 8},$${o + 9},$${o + 10},$${o + 11},$${o + 12})`;
    }).join(",");
    await pool.query(
      `INSERT INTO employees (id, first_name, last_name, email, department, country, currency, job_title, level, manager_id, date_of_joining, base_salary) VALUES ${placeholders}`, values);
  }
  const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM employees");
  console.log(`seed: ${rows[0].c} employees in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  if (rows[0].c !== 10_000) throw new Error(`seed count wrong: ${rows[0].c}`);

  const app = createApp(new PgEmployeeRepository(pool));
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  const base = `http://localhost:${port}`;
  const get = async (p: string) => { const r = await fetch(base + p); return { status: r.status, body: await r.json() as Record<string, any> }; };
  const health = await get("/api/health");
  console.log("GET /api/health:", health.status, JSON.stringify(health.body));
  const list = await get("/api/employees?page=1&pageSize=5");
  console.log("GET /api/employees?page=1&pageSize=5:", list.status, "rows:", list.body.data?.length, "total:", list.body.meta?.total);
  const search = await get("/api/employees?search=Priya&pageSize=3");
  console.log("GET /api/employees?search=Priya:", search.status, "total:", search.body.meta?.total);
  const analytics = await get("/api/analytics/summary");
  console.log("GET /api/analytics/summary:", analytics.status, "totalEmployees:", analytics.body.data?.totalEmployees, "medianUsd:", analytics.body.data?.medianSalaryUsd);
  const firstId = list.body.data[0].id as string;
  const patch = await fetch(`${base}/api/employees/${firstId}/salary`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newSalary: 999999, reason: "Verification check" }) });
  const patchBody = await patch.json() as Record<string, any>;
  console.log("PATCH salary:", patch.status, "old:", patchBody.data?.history?.oldSalary, "new:", patchBody.data?.history?.newSalary);
  const detail = await get(`/api/employees/${firstId}`);
  console.log("GET /api/employees/:id history rows:", detail.body.data?.salaryHistory?.length);
  const csv = await fetch(`${base}/api/employees/export?format=csv`);
  const csvText = await csv.text();
  console.log("GET export CSV:", csv.status, "lines:", csvText.split("\n").length, "header:", csvText.split("\n")[0]);
  server.close();
  await pool.end();
  console.log("verify-pgmem: ALL OK");
}
main().catch((e) => { console.error("verify-pgmem FAILED:", e); process.exit(1); });
