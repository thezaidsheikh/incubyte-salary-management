/**
 * Public API of the analytics module: types, the pure computation, the
 * service and the module factory.
 */
export type { AnalyticsSummary, TopEarnerInput } from "./analytics.types.js";
export { AnalyticsService, computeAnalytics, groupStats } from "./analytics.service.js";
export { createAnalyticsModule } from "./analytics.factory.js";
