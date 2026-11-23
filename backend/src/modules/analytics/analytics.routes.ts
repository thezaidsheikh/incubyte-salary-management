import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "../../shared/http.js";
import { createAnalyticsController } from "./analytics.controller.js";
import type { AnalyticsService } from "./analytics.service.js";

/**
 * Build the analytics router (mounted at /api/analytics).
 * @param service Analytics business logic, injected into the controller.
 * @returns An Express router with the GET /summary route.
 */
export function createAnalyticsRouter(service: AnalyticsService): ExpressRouter {
  const router = Router();
  const c = createAnalyticsController(service);
  router.get("/summary", asyncHandler(c.summary));
  return router;
}
