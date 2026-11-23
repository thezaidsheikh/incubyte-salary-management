# Salary Management — Incubyte Assessment

Web app for an HR Manager to manage salaries for 10,000 employees at ACME
org (currently on Excels), and to answer "how does the org pay people?".
See `docs/REQUIREMENTS.md` first — it was written before any code.

**Stack:** Node.js 24 + TypeScript + Express + `pg` + PostgreSQL 16
(backend, modular monolith), Next.js 14 (App Router) + React 18 +
TypeScript + Tailwind CSS 3 (frontend). Tests: Vitest (+ Supertest,
Testing Library) with v8 coverage.

**Measured (23 Nov 2026):** backend 80/80 tests, 99.73% lines covered;
frontend 62/62 tests, 100% lines covered; seed exactly 10,000 employees
in ~0.8 s. Full numbers in `docs/TESTING.md` and `docs/VERIFICATION.md`.

## Quick start

```bash
# 1. Database (needs Docker, or a local Postgres 16)
docker compose up -d
# 2. Backend
cd backend && cp .env.example .env && npm install
npm run migrate   # psql $DATABASE_URL -f migrations/001_init.sql
npm run seed      # exactly 10,000 employees
npm run dev       # http://localhost:4000
# 3. Frontend (new terminal)
cd frontend && cp .env.example .env.local && npm install && npm run dev   # http://localhost:3000
```

## Architecture (one paragraph)

A modular monolith: the backend is one deployable Express app made of
three modules — `employees` (list/search/pagination/detail/create/export),
`salary` (salary-change rule + audit) and `analytics` (dashboard numbers)
— plus a `shared` kernel (pool, errors, HTTP helpers, maths). Each module
owns its routes, controller, service and repository and talks to other
modules only through their public interfaces, so any module can later be
extracted into a microservice without a rewrite (the exact extraction
path is in `docs/ARCHITECTURE.md`). The frontend is Next.js App Router
with file routes `/`, `/employees`, `/employees/new`, `/employees/[id]`;
pages are client components fetching from the API at runtime.

```
Next.js 14 (frontend/) ──HTTP/JSON──► Express modular monolith (backend/src)
                                        modules/employees · salary · analytics
                                        ──pg Pool──► PostgreSQL 16
```

## API

- `GET /api/health`
- `GET /api/employees?search=&department=&country=&level=&sortBy=&sortOrder=&page=&pageSize=`
- `GET /api/employees/:id` (with salary history)
- `POST /api/employees`
- `PATCH /api/employees/:id/salary` — `{ newSalary, reason }`, writes a SalaryHistory row in the same transaction
- `GET /api/analytics/summary`
- `GET /api/employees/export?format=csv` (streamed, respects filters)

Every response uses one envelope: success `{ data, meta? }`, error
`{ error: { code, message, details? } }`.

## Folder structure

```
backend/src/
  app.ts                 # composition root (wiring only)
  index.ts               # bootstrap (listen only)
  shared/                # db, errors, http, analytics — cross-cutting only
  modules/employees/     # types, repository, validation, service, controller, routes, factory
  modules/salary/        # salary-change rule + audit
  modules/analytics/     # dashboard maths (pure computeAnalytics)
  seed/                  # deterministic 10,000-employee generator + factory
  ../migrations/001_init.sql
  ../tests/              # 80 tests (Vitest + Supertest + pg-mem)
frontend/src/
  app/                   # Next.js routes: /, /employees, /employees/new, /employees/[id]
  features/employees/    # typed API client + types (single source)
  shared/components/     # StatCard, BarList
  shared/lib/constants.ts
  shared/utils/format.ts
docs/                    # reviewer artifacts (see below)
zaid-notes/              # gitignored — candidate's own short notes, never pushed
```

## Tests

```bash
cd backend && npm test && npm run coverage    # 80 tests, 99.73% lines
cd frontend && npm test && npm run coverage   # 62 tests, 100% lines
cd backend && npx tsx scripts/verify-pgmem.ts # migration + 10k seed + HTTP smoke, no Postgres server
```

## Docs for the reviewer

- `docs/REQUIREMENTS.md` — one-page requirements (written first)
- `docs/ARCHITECTURE.md` — modular monolith, module boundaries, microservice extraction path
- `docs/DESIGN-PATTERNS.md` — Repository, Service, DI, Factory, SOLID, DRY/KISS/YAGNI — each with file + example
- `docs/TRADEOFFS.md` — every major decision + what was rejected
- `docs/PERFORMANCE.md` — how 10,000 rows stay fast, with measured numbers
- `docs/TESTING.md` — coverage numbers and the exact gaps below 100%
- `docs/VERIFICATION.md` — every requirement checked against the code, with evidence
- `docs/AI-USAGE.md` — how AI was used, prompts, what was verified by hand

## Out of scope (deliberate)

Payroll/tax, auth/RBAC, leave/attendance, live FX conversion, AI chatbot
— reasons in `docs/REQUIREMENTS.md`. Deployment + video demo are phase 2
(not done yet); deployment notes are in `docs/ARCHITECTURE.md`.
