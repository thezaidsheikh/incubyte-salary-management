/**
 * Public API of the salary module: the service and the module factory.
 * The module consumes the employees module only through its public API
 * (the EmployeeRepository interface) — never its repository class or SQL.
 */
export { SalaryService } from "./salary.service.js";
export { createSalaryModule } from "./salary.factory.js";
