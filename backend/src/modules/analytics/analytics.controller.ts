import type { Request, Response } from "express";
import type { AnalyticsService } from "./analytics.service.js";

// Pattern: Thin Controller — no business logic, no SQL here.

/**
 * Build the analytics HTTP handlers bound to a service.
 * @param service Analytics business logic.
 * @returns Handlers for the summary route.
 */
export function createAnalyticsController(service: AnalyticsService) {
  return {
    /**
     * GET /api/analytics/summary — the whole-org summary.
     * @param _req Unused request.
     * @param res Response with `{ data: summary }`.
     */
    summary: async (_req: Request, res: Response): Promise<void> => {
      res.json({ data: await service.summary() });
    },
  };
}
