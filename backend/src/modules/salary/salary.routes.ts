import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "../../shared/http.js";
import { createSalaryController } from "./salary.controller.js";
import type { SalaryService } from "./salary.service.js";

/**
 * Build the salary router (mounted at /api/employees, alongside the
 * employee router — both serve that prefix, different sub-paths).
 * @param service Salary business logic, injected into the controller.
 * @returns An Express router with the PATCH /:id/salary route.
 */
export function createSalaryRouter(service: SalaryService): ExpressRouter {
  const router = Router();
  const c = createSalaryController(service);
  router.patch("/:id/salary", asyncHandler(c.updateSalary));
  return router;
}
