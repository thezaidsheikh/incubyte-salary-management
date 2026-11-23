import cors from "cors";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { analyticsController, employeeController } from "./controllers/employeeController";
import { PrismaEmployeeRepository, type EmployeeRepository } from "./repositories/employeeRepository";
import { AnalyticsService, EmployeeService } from "./services/employeeService";
import { ApiError } from "./utils/errors";
import { prisma } from "./db";

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res).catch(next); };
}

export function createApp(repo: EmployeeRepository = new PrismaEmployeeRepository(prisma)): Express {
  const app = express();
  app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:5173" }));
  app.use(express.json());
  const employees = new EmployeeService(repo);
  const analytics = new AnalyticsService(repo);
  const ec = employeeController(employees);
  const ac = analyticsController(analytics);

  app.get("/api/health", (_req, res) => res.json({ data: { status: "ok" } }));
  app.get("/api/employees/export", asyncHandler(ec.exportCsv));
  app.get("/api/employees", asyncHandler(ec.list));
  app.get("/api/employees/:id", asyncHandler(ec.getById));
  app.post("/api/employees", asyncHandler(ec.create));
  app.patch("/api/employees/:id/salary", asyncHandler(ec.updateSalary));
  app.get("/api/analytics/summary", asyncHandler(ac.summary));

  app.use((_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } }));
  // Single error envelope for every failure.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ApiError) return res.status(err.status).json({ error: { code: "API_ERROR", message: err.message, details: err.details } });
    console.error(err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  });
  return app;
}
