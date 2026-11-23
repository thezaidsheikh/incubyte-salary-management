import type { Request, Response } from "express";
import { createEmployeeSchema, listQuerySchema, updateSalarySchema } from "../validation/employee.js";
import { ApiError } from "../utils/errors.js";
import type { AnalyticsService, EmployeeService } from "../services/employeeService.js";

function parseBody<T>(schema: { parse: (v: unknown) => T }, body: unknown): T {
  try { return schema.parse(body); }
  catch (e: unknown) {
    const err = e as { issues?: { path: (string | number)[]; message: string }[] };
    throw new ApiError(400, "Validation failed", err.issues?.map((i) => ({ field: i.path.join("."), message: i.message })));
  }
}

export function employeeController(service: EmployeeService) {
  return {
    list: async (req: Request, res: Response) => {
      const q = parseBody(listQuerySchema, req.query);
      res.json(await service.list(q));
    },
    getById: async (req: Request, res: Response) => {
      res.json({ data: await service.getById(req.params.id as string) });
    },
    create: async (req: Request, res: Response) => {
      const input = parseBody(createEmployeeSchema, req.body);
      res.status(201).json({ data: await service.create(input) });
    },
    updateSalary: async (req: Request, res: Response) => {
      const input = parseBody(updateSalarySchema, req.body);
      const { employee, history } = await service.updateSalary(req.params.id as string, input);
      res.json({ data: { employee, history } });
    },
    exportCsv: async (req: Request, res: Response) => {
      // Stream CSV in pages so a filtered 10k export never sits fully in RAM.
      const q = parseBody(listQuerySchema, { ...(req.query as Record<string, unknown>), page: 1, pageSize: 100 });
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="employees.csv"');
      res.write("id,firstName,lastName,email,department,country,currency,jobTitle,level,baseSalary,dateOfJoining\n");
      let page = 1;
      for (;;) {
        const { data } = await service.list({ ...q, page, pageSize: 1000 });
        if (data.length === 0) break;
        for (const e of data) {
          res.write(`${e.id},${e.firstName},${e.lastName},${e.email},${e.department},${e.country},${e.currency},${e.jobTitle},${e.level},${e.baseSalary},${new Date(e.dateOfJoining).toISOString().slice(0, 10)}\n`);
        }
        if (data.length < 1000) break;
        page++;
      }
      res.end();
    },
  };
}

export function analyticsController(service: AnalyticsService) {
  return {
    summary: async (_req: Request, res: Response) => {
      res.json({ data: await service.summary() });
    },
  };
}
