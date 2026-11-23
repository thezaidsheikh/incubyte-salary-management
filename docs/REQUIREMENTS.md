# Salary Management — Requirements (one page)

## Goal
Replace ACME's Excel-based salary tracking with a web app for 10,000 employees, so the HR Manager can manage salaries and answer "how does the org pay people?" quickly and correctly.

## Persona
HR Manager, ACME org. Non-technical, works daily with salary data, needs search, correct numbers, and a clear audit trail. No developer or admin persona in scope.

## Problem
Salary data for 10,000 people across multiple countries lives in spreadsheets: slow to search, easy to overwrite by mistake, no history of who changed what, and no reliable answer to pay questions (averages, gaps, outliers).

## In scope
1. **Employees** — searchable, filterable (department / country / level), sortable, server-paginated list; never load all 10,000 rows at once.
2. **Employee detail** — profile + current salary + full salary history.
3. **Salary change** — validated update (`newSalary > 0`, `reason` required); every change writes an audit row (old, new, who, when, reason); salary is never silently overwritten.
4. **Add employee** — validated create with the same fields as the list.
5. **Analytics** — headcount, total monthly payroll, average + median, breakdown by department / country / level, salary-distribution buckets, top 10 earners, outliers (> 2× department median).
6. **Export** — CSV export respecting current filters, streamed.
7. **Seed** — deterministic script generating exactly 10,000 employees (fixed seed, realistic bands by level + country).

## Deliberately out of scope
| Left out | Why |
|---|---|
| Payroll processing, tax, payslips | Different domain; assessment is salary *management & insight*, not payroll. Adds risk, no HR ask. |
| Auth / RBAC / login | Single HR persona in the brief; adds security surface and slows the core. Noted as next step. |
| Leave / attendance | Unrelated to the pay question. |
| Live currency conversion | Salaries are stored in local currency; conversion needs a live FX source and adds non-determinism. |
| AI chatbot / NLP Q&A | Nice-to-have; analytics + filters answer the same questions deterministically and testably. |

## Data model (summary)
`Employee` (id, name, email unique, department, country, currency, jobTitle, level, managerId nullable, dateOfJoining, status, baseSalary) + `SalaryHistory` (employeeId, oldSalary, newSalary, currency, reason, changedBy, changedAt). Current salary is denormalised on `Employee` for fast reads; history is the audit source of truth.

## Non-functional
- 10,000 rows must feel instant: server pagination (default 20, max 100), DB indexes on department, country, level, baseSalary, email, name.
- Tests fast + deterministic: no live DB needed for unit tests; seeded RNG makes seed repeatable.
- Incremental commits; production-quality code, validation, and a single error envelope.

## Success criteria
HR can find any employee in seconds, change a salary with a reason and see it in history, read the pay picture from the dashboard, and export a filtered CSV. All of the above works from a clean checkout with `seed` + `run`, and tests pass.
