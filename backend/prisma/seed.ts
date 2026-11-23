import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { generateEmployees } from "../src/utils/seedData";

const prisma = new PrismaClient();
const TOTAL = 10_000;

async function main() {
  const started = Date.now();
  const employees = generateEmployees(TOTAL, 42);
  // Map placeholder manager ids (emp-<index>) to real UUIDs.
  const ids = employees.map(() => randomUUID());
  const rows = employees.map((e, i) => ({
    id: ids[i],
    ...e,
    managerId: e.managerId ? ids[Number(e.managerId.replace("emp-", ""))] : null,
  }));
  console.log(`Generated ${rows.length} employees, clearing old data…`);
  await prisma.salaryHistory.deleteMany();
  await prisma.employee.deleteMany();
  const BATCH = 1000;
  for (let i = 0; i < rows.length; i += BATCH) {
    await prisma.employee.createMany({ data: rows.slice(i, i + BATCH), skipDuplicates: true });
    console.log(`  inserted ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  const count = await prisma.employee.count();
  console.log(`Seeded ${count} employees in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  if (count !== TOTAL) throw new Error(`Expected ${TOTAL} employees, got ${count}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
