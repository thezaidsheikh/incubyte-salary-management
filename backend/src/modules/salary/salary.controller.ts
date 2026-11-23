import type { Request, Response } from "express";
import { parseWithSchema } from "../../shared/http.js";
import { updateSalarySchema } from "../employees/employee.validation.js";
import type { SalaryService } from "./salary.service.js";

// Pattern: Thin Controller — validates the body, calls the service, shapes
// the response. No business logic, no SQL here.

/**
 * Build the salary HTTP handlers bound to a service.
 * @param service Salary business logic.
 * @returns Handlers for the salary update route.
 */
export function createSalaryController(service: SalaryService) {
  return {
    /**
     * PATCH /api/employees/:id/salary — validated body, then the updated
     * employee plus the new history row.
     * @param req Request; `id` is the employee id, body is the change.
     * @param res Response with `{ data: { employee, history } }`.
     */
    updateSalary: async (req: Request, res: Response): Promise<void> => {
      const input = parseWithSchema(updateSalarySchema, req.body);
      const { employee, history } = await service.updateSalary(req.params.id as string, input);
      res.json({ data: { employee, history } });
    },
  };
}
