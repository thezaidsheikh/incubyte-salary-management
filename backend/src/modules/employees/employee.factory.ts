import type { Pool } from "pg";
import type { Router as ExpressRouter } from "express";
import {
  PgEmployeeRepository,
  type EmployeeRepository,
} from "./employee.repository.js";
import { EmployeeService } from "./employee.service.js";
import { createEmployeeRouter } from "./employee.routes.js";

// Pattern: Factory + DI — the module factory wires repository -> service
// -> router from one input, so the composition root never news up
// internals. It accepts a Pool (production) or a ready repository
// (tests injecting InMemory), keeping both call sites identical.

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
 * Build the employees module: repository, service and router.
 * @param poolOrRepo Postgres pool, or an EmployeeRepository (tests).
 * @returns The wired `{ router, service }` for the composition root.
 */
export function createEmployeeModule(poolOrRepo: Pool | EmployeeRepository): {
  router: ExpressRouter;
  service: EmployeeService;
} {
  const repository = resolveRepository(poolOrRepo);
  const service = new EmployeeService(repository);
  return { router: createEmployeeRouter(service), service };
}
