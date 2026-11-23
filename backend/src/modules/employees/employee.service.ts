import { paginationMeta } from "../../shared/analytics.js";
import { badRequest, notFound } from "../../shared/errors.js";
import type { EmployeeRepository } from "./employee.repository.js";
import type { EmployeeRow, EmployeeWithHistory } from "./employee.types.js";
import type { CreateEmployeeInput, ListQuery } from "./employee.validation.js";

// Pattern: Service layer — all employee business rules live here, not in
// controllers or repositories. Pattern: DI — the repository arrives via
// the constructor as the EmployeeRepository interface (SOLID Dependency
// Inversion), so this service never knows about Postgres or memory.

/**
 * Employee business logic: listing, lookup, creation. Salary changes
 * live in the salary module's SalaryService, not here — one service,
 * one reason to change (SOLID Single Responsibility).
 */
export class EmployeeService {
  /**
   * @param repo Employee store, injected as the interface (Pg or InMemory).
   */
  constructor(private repo: EmployeeRepository) {}

  /**
   * List employees, paged. The validated query doubles as the filter:
   * search/department/country/level are the filters, the rest is paging.
   * @param q Validated list query.
   * @returns `{ data, meta }` in the API's success envelope shape.
   */
  list(q: ListQuery): Promise<{ data: EmployeeRow[]; meta: ReturnType<typeof paginationMeta> }> {
    return this.repo.list(q, q).then(({ items, total }) => ({
      data: items,
      meta: paginationMeta(total, q.page, q.pageSize),
    }));
  }

  /**
   * Fetch one employee with salary history.
   * @param id Employee id.
   * @returns The employee with history.
   * @throws ApiError 404 when the id does not exist.
   */
  async getById(id: string): Promise<EmployeeWithHistory> {
    const e = await this.repo.getById(id);
    if (!e) throw notFound("Employee");
    return e;
  }

  /**
   * Create an employee. A duplicate email is a client error (400), not a
   * 500: the repository's unique-violation is translated here.
   * @param input Validated create payload.
   * @returns The created employee.
   * @throws ApiError 400 when the email already exists.
   */
  async create(input: CreateEmployeeInput): Promise<EmployeeRow> {
    try {
      return await this.repo.create({
        ...input,
        dateOfJoining: new Date(input.dateOfJoining),
        managerId: input.managerId ?? null,
      });
    } catch (e: unknown) {
      if (e instanceof Error && /unique/i.test(e.message)) {
        throw badRequest("An employee with this email already exists");
      }
      throw e;
    }
  }
}
