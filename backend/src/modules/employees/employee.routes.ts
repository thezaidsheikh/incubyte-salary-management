import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "../../shared/http.js";
import { createEmployeeController } from "./employee.controller.js";
import type { EmployeeService } from "./employee.service.js";

/**
 * Build the employee router (mounted at /api/employees).
 * `/export` is registered before `/:id` so "export" is never treated as
 * an employee id.
 * @param service Employee business logic, injected into the controller.
 * @returns An Express router with list/get/create/export routes.
 */
export function createEmployeeRouter(service: EmployeeService): ExpressRouter {
  const router = Router();
  const c = createEmployeeController(service);
  router.get("/export", asyncHandler(c.exportCsv));
  router.get("/", asyncHandler(c.list));
  router.get("/:id", asyncHandler(c.getById));
  router.post("/", asyncHandler(c.create));
  return router;
}
