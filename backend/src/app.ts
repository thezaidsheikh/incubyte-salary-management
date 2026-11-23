import cors from "cors";
import express, { type Express } from "express";
import { pool } from "./shared/db.js";
import { errorHandler, notFoundHandler } from "./shared/http.js";
import { createAnalyticsModule } from "./modules/analytics/index.js";
import { createEmployeeModule, type EmployeeRepository } from "./modules/employees/index.js";
import { createSalaryModule } from "./modules/salary/index.js";

// Composition root ONLY: this file wires modules together and mounts
// routes. It holds no business logic, no SQL and no validation — each
// module factory builds its own repository -> service -> router chain
// (Pattern: DI — a repository passed in here flows into every service).

/**
 * Build the Express app.
 * @param repo Optional repository to inject (tests pass InMemory here);
 * when omitted, a PgEmployeeRepository over the default pool is used.
 * @returns The configured Express app (not yet listening).
 */
export function createApp(repo?: EmployeeRepository): Express {
  const app = express();
  // Next.js frontend origin; override with FRONTEND_URL in production.
  app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000" }));
  app.use(express.json());

  const source = repo ?? pool;
  const employees = createEmployeeModule(source);
  const salary = createSalaryModule(source);
  const analytics = createAnalyticsModule(source);

  // Health check — no dependencies, always available.
  app.get("/api/health", (_req, res) => res.json({ data: { status: "ok" } }));
  app.use("/api/employees", employees.router);
  app.use("/api/employees", salary.router);
  app.use("/api/analytics", analytics.router);

  app.use(notFoundHandler);
  // Single error envelope for every failure.
  app.use(errorHandler);
  return app;
}
