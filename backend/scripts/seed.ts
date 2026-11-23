import "dotenv/config";
import { randomUUID } from "node:crypto";
import { pool } from "../src/db.js";
import { generateEmployees } from "../src/utils/seedData.js";

const TOTAL = 10_000;

async function main() {
  const started = Date.now();
  const employees = generateEmployees(TOTAL, 42);
  const ids = employees.map(() => randomUUID());
  console.log(`Generated ${employees.length} employees, clearing old data…`);
  await pool.query("TRUNCATE salary_history, employees RESTART IDENTITY CASCADE");
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
      `INSERT INTO employees (id, first_name, last_name, email, department, country, currency, job_title, level, manager_id, date_of_joining, base_salary) VALUES ${placeholders}`,
      values);
    console.log(`  inserted ${Math.min(i + BATCH, employees.length)}/${employees.length}`);
  }
  const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM employees");
  console.log(`Seeded ${rows[0].c} employees in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  if (rows[0].c !== TOTAL) throw new Error(`Expected ${TOTAL} employees, got ${rows[0].c}`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => pool.end());
