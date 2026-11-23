/**
 * Public API of the employees module. Other modules import through this
 * file only — never through the module's internal files — so the module's
 * boundary stays explicit and refactorable. Only types, the repository
 * interface and the module factory are public; concrete repository
 * classes live in employee.repository.ts.
 */
export type {
  EmployeeCreateData,
  EmployeeFilters,
  EmployeeRow,
  EmployeeWithHistory,
  SalaryHistoryRow,
  SalaryPoint,
} from "./employee.types.js";
export type { EmployeeRepository } from "./employee.repository.js";
export { createEmployeeModule } from "./employee.factory.js";
