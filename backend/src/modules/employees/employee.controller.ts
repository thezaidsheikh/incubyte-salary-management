import type { Request, Response } from "express";
import { parseWithSchema } from "../../shared/http.js";
import { createEmployeeSchema, listQuerySchema } from "./employee.validation.js";
import type { EmployeeService } from "./employee.service.js";

// Pattern: Thin Controller — handlers only validate input, call the
// service, and shape the response. No business logic, no SQL here.

/**
 * Build the employee HTTP handlers bound to a service.
 * Why a factory: the service is injected, so tests can pass a fake
 * service and exercise handlers without a repository or database.
 * @param service Employee business logic.
 * @returns Handlers for list, getById, create and the CSV export.
 */
export function createEmployeeController(service: EmployeeService) {
  return {
    /**
     * GET /api/employees — validated query, then `{ data, meta }`.
     * @param req Request; query holds search/filters/sort/page.
     * @param res Response with the paged list.
     */
    list: async (req: Request, res: Response): Promise<void> => {
      const q = parseWithSchema(listQuerySchema, req.query);
      res.json(await service.list(q));
    },

    /**
     * GET /api/employees/:id — one employee with salary history.
     * @param req Request; `id` is the employee id.
     * @param res Response with `{ data: employee }`.
     */
    getById: async (req: Request, res: Response): Promise<void> => {
      res.json({ data: await service.getById(req.params.id as string) });
    },

    /**
     * POST /api/employees — validated body, 201 on success.
     * @param req Request; body is the new employee.
     * @param res Response with `{ data: employee }` and status 201.
     */
    create: async (req: Request, res: Response): Promise<void> => {
      const input = parseWithSchema(createEmployeeSchema, req.body);
      res.status(201).json({ data: await service.create(input) });
    },

    /**
     * GET /api/employees/export — stream the (filtered) employee list as
     * CSV in pages of 1,000, so a 10k export never sits fully in RAM.
     * The `format` query param is accepted for API symmetry and ignored:
     * CSV is the only export format.
     * @param req Request; query holds the same filters as the list.
     * @param res Response streaming `text/csv` with a download filename.
     */
    exportCsv: async (req: Request, res: Response): Promise<void> => {
      const q = parseWithSchema(listQuerySchema, {
        ...(req.query as Record<string, unknown>),
        page: 1,
        pageSize: 100,
      });
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="employees.csv"');
      res.write(
        "id,firstName,lastName,email,department,country,currency,jobTitle,level,baseSalary,dateOfJoining\n",
      );
      let page = 1;
      for (;;) {
        const { data } = await service.list({ ...q, page, pageSize: 1000 });
        if (data.length === 0) break;
        for (const e of data) {
          res.write(
            `${e.id},${e.firstName},${e.lastName},${e.email},${e.department},${e.country},${e.currency},${e.jobTitle},${e.level},${e.baseSalary},${new Date(e.dateOfJoining).toISOString().slice(0, 10)}\n`,
          );
        }
        if (data.length < 1000) break;
        page++;
      }
      res.end();
    },
  };
}
