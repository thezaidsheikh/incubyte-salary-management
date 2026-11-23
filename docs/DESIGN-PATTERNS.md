# Design Patterns & Principles — where each one lives

Every pattern below is implemented in the code, not just named. Each entry
gives the location, why it was used, and a short example.

## Repository pattern

- **Where:** `backend/src/modules/employees/employee.repository.ts` —
  `EmployeeRepository` (interface), `PgEmployeeRepository`,
  `InMemoryEmployeeRepository`.
- **Why:** only the repository knows SQL. Services and tests depend on the
  interface, so the database can change (or be faked in tests) without
  touching business logic.
- **Example:**
  ```ts
  // Service code never sees SQL — it only sees the interface:
  constructor(private repo: EmployeeRepository) {}
  const employee = await this.repo.getById(id);
  ```

## Service layer

- **Where:** `modules/employees/employee.service.ts` (`EmployeeService`),
  `modules/salary/salary.service.ts` (`SalaryService`),
  `modules/analytics/analytics.service.ts` (`AnalyticsService`,
  pure `computeAnalytics`).
- **Why:** business rules live in exactly one place. Example: "a salary
  change must differ from the current salary and must be audited" is
  enforced in `SalaryService`, so no controller, UI or test can bypass it.
- **Example:**
  ```ts
  if (input.newSalary === current.baseSalary)
    throw badRequest("newSalary must differ from the current salary");
  ```

## Thin Controller

- **Where:** `modules/*/ *.controller.ts` (e.g.
  `modules/salary/salary.controller.ts`).
- **Why:** a controller only validates input, calls one service method and
  shapes the response. If a controller grows past that, the rule belongs
  in the service.
- **Example:**
  ```ts
  updateSalary: async (req, res) => {
    const input = parseWithSchema(updateSalarySchema, req.body);
    res.json({ data: await service.updateSalary(req.params.id, input) });
  }
  ```

## Dependency Injection (constructor injection)

- **Where:** all three services take `EmployeeRepository` in the
  constructor; module factories (`modules/*/ *.factory.ts`) receive a
  `Pool | EmployeeRepository`; `app.ts` (composition root) wires them.
- **Why:** a class never creates its own dependencies, so tests can inject
  `InMemoryEmployeeRepository` and production injects the `pg` one — same
  code, different wiring.
- **Example:**
  ```ts
  // modules/employees/employee.factory.ts (actual code):
  export function createEmployeeModule(poolOrRepo: Pool | EmployeeRepository) {
    const repository = resolveRepository(poolOrRepo); // Pool -> Pg repo, or use the given repo
    const service = new EmployeeService(repository);
    return { router: createEmployeeRouter(service), service };
  }
  ```

## Factory pattern

- **Where:** `backend/src/seed/employeeFactory.ts` —
  `createSeedEmployee(rng, index, usedEmails, managerIds)`; and the
  module factories above (`createEmployeeModule`, `createSalaryModule`,
  `createAnalyticsModule`).
- **Why:** creating a seed employee involves email-uniqueness, level
  weighting, salary bands and manager links. The factory hides that
  construction so `generateEmployees` stays a short loop.
- **Example:**
  ```ts
  const employee = createSeedEmployee(rng, i, usedEmails, managerIds);
  ```

## SOLID — one example per letter, all in this codebase

| Letter | Principle | Where + example |
|---|---|---|
| S | Single Responsibility | `modules/salary/` owns only salary changes; `modules/analytics/` owns only dashboard maths. A salary rule change touches one module. |
| O | Open/Closed | Add a new repository (e.g. a cached one) by implementing `EmployeeRepository` — `EmployeeService` does not change. |
| L | Liskov Substitution | `InMemoryEmployeeRepository` substitutes for `PgEmployeeRepository` in every API/service test (`createApp(new InMemoryEmployeeRepository())`) with no test-code change. |
| I | Interface Segregation | Services depend on the small `EmployeeRepository` interface (list/get/create/updateSalary/points/export), not on the whole `pg` `Pool` API. |
| D | Dependency Inversion | `SalaryService` depends on the `EmployeeRepository` interface (imported via `modules/employees/index.ts`), never on `PgEmployeeRepository` or SQL. |

## DRY — Don't Repeat Yourself

- **Where:** `frontend/src/shared/lib/constants.ts` (departments,
  countries, levels listed once, imported by Employees + AddEmployee);
  `backend/src/shared/analytics.ts` (median/average/pagination used by
  services and tests); one error envelope in `shared/http.ts`.
- **Example:** the country→currency map exists once in `constants.ts`;
  AddEmployee derives the currency from it instead of hard-coding it.

## KISS — Keep It Simple, Stupid

- **Where:** plain tables + CSS bars instead of a chart library;
  `pg` + one SQL migration instead of an ORM; client components in
  Next.js instead of SSR data fetching for dynamic HR data.
- **Why:** every added dependency is a failure mode and a thing to learn.
  The brief explicitly says it is not looking for the most complex system.

## YAGNI — You Aren't Gonna Need It

- **Where:** no auth, no payroll/tax, no leave, no live FX, no chatbot,
  no Redis cache, no materialised views — all listed as out of scope in
  `docs/REQUIREMENTS.md` with reasons.
- **Example:** a cache was not added because Postgres answers these
  queries in milliseconds at 10k rows; it would add stale-data risk for
  no measured gain.
