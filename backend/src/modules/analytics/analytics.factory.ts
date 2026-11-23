import type { Pool } from "pg";
import type { Router as ExpressRouter } from "express";
import { PgEmployeeRepository } from "../employees/employee.repository.js";
import type { EmployeeRepository } from "../employees/index.js";
import { AnalyticsService } from "./analytics.service.js";
import { createAnalyticsRouter } from "./analytics.routes.js";

// Pattern: Factory + DI — wires repository -> service -> router from one
// input. Accepts a Pool (production) or a ready repository (tests).

/**
 * Resolve the factory input to a repository: a Pool becomes a
 * PgEmployeeRepository; an already-built repository is used as-is.
 * @param poolOrRepo Pool to build a Postgres repository from, or a repository.
 * @returns An EmployeeRepository.
 */
function resolveRepository(poolOrRepo: Pool | EmployeeRepository): EmployeeRepository {
  return "query" in poolOrRepo && "connect" in poolOrRepo
    ? new PgEmployeeRepository(poolOrRepo as Pool)
    : (poolOrRepo as EmployeeRepository);
}

/**
 * Build the analytics module: service and router.
 * @param poolOrRepo Postgres pool, or an EmployeeRepository (tests).
 * @returns The wired `{ router, service }` for the composition root.
 */
export function createAnalyticsModule(poolOrRepo: Pool | EmployeeRepository): {
  router: ExpressRouter;
  service: AnalyticsService;
} {
  const repository = resolveRepository(poolOrRepo);
  const service = new AnalyticsService(repository);
  return { router: createAnalyticsRouter(service), service };
}
