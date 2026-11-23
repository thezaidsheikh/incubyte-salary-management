# Architecture

## Overview
```
┌─────────────┐   HTTP/JSON    ┌──────────────────┐   Prisma    ┌──────────────┐
│ React + Vite│ ─────────────► │ Express + TS     │ ──────────► │ PostgreSQL 16│
│ (frontend/) │                │ (backend/src)    │             │ Employee +   │
│ Dashboard / │                │ routes →         │             │ SalaryHistory│
│ Employees / │                │ controllers →    │             └──────────────┘
│ Detail / Add│                │ services →       │
└─────────────┘                │ repositories     │
                               └──────────────────┘
```
Monorepo, two packages, one Postgres. No auth (out of scope, see REQUIREMENTS.md).

## Backend layering (`backend/src`)
- `routes/` — thin HTTP wiring only: path, method, which controller.
- `controllers/` — parse/validate input (Zod), call service, shape the response envelope.
- `services/` — business rules: salary validation, history audit, analytics math (median, buckets, outliers), pagination math. No SQL here.
- `repositories/` — the only place that talks to Prisma/DB: queries, indexes used, pagination.
- `validation/` — Zod schemas, shared by controllers and tests.
- `utils/` — error envelope, pagination helpers, median, seeded RNG.

Why layered: a rule (e.g. "every salary change writes history") lives in one place (service), so the UI, a future CLI, or a test cannot bypass it.

## Request flow (example)
HR searches "Priya" → frontend `GET /api/employees?search=Priya&page=1&pageSize=20` → route → controller validates query → service builds filters → repository runs one indexed `WHERE name/email ILIKE` query with `LIMIT/OFFSET` + a `COUNT` → controller returns `{ data, meta: { page, pageSize, total, totalPages } }` → table renders 20 rows, not 10,000.

## Data flow for a salary change
`PATCH /api/employees/:id/salary` → validate `newSalary > 0`, `reason` non-empty → service loads employee → Prisma transaction: update `Employee.baseSalary` AND insert `SalaryHistory` (old, new, reason, changedBy="HR Manager") → return updated employee + history row. If either write fails, both roll back.

## Frontend (`frontend/src`)
- `pages/` — Dashboard, Employees, EmployeeDetail, AddEmployee.
- `components/` — EmployeeTable, SalaryForm, StatCard, Filters, Charts (plain tables/bars, no chart lib — keeps bundle small and deterministic).
- `api/` — one typed client (`api.ts`) for all backend calls; no fetch scattered in pages.

## Error envelope
Every API response: success `{ data, meta? }`, error `{ error: { code, message, details? } }` with proper HTTP status (400 validation, 404 not found, 500 server). Frontend shows the message, never a stack trace.

## Performance notes
See `docs/PERFORMANCE.md`. Headlines: server pagination, indexes on department/country/level/baseSalary/email/name, analytics computed with grouped SQL + in-memory median on small aggregates, CSV streamed, seed batched (1,000 rows per insert).

## Deployment (phase 2)
Backend: Render/Railway + managed Postgres (Neon). Frontend: Vercel/Netlify, `VITE_API_URL` points at the backend. Locally: `docker-compose up -d` for Postgres, or a local Postgres 16.
