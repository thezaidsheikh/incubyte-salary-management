-- Salary Management — ACME org. PostgreSQL 16.
-- Current salary on Employee for fast reads; SalaryHistory is the audit truth.
CREATE TYPE level AS ENUM ('Junior','Mid','Senior','Lead','Manager','Director');
CREATE TYPE employment_status AS ENUM ('Active','OnLeave');

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL,
  country TEXT NOT NULL,
  currency CHAR(3) NOT NULL,
  job_title TEXT NOT NULL,
  level level NOT NULL,
  manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  date_of_joining DATE NOT NULL,
  employment_status employment_status NOT NULL DEFAULT 'Active',
  base_salary INTEGER NOT NULL CHECK (base_salary > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS salary_history (
  id UUID PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  old_salary INTEGER NOT NULL,
  new_salary INTEGER NOT NULL CHECK (new_salary > 0),
  currency CHAR(3) NOT NULL,
  reason TEXT NOT NULL,
  changed_by TEXT NOT NULL DEFAULT 'HR Manager',
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Indexes: the filters/sorts the UI actually uses (see docs/PERFORMANCE.md).
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_country ON employees(country);
CREATE INDEX IF NOT EXISTS idx_employees_level ON employees(level);
CREATE INDEX IF NOT EXISTS idx_employees_base_salary ON employees(base_salary);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_salary_history_employee ON salary_history(employee_id, changed_at);
