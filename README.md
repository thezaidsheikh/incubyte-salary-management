# Salary Management — Incubyte Assessment

Web app for an HR Manager to manage salaries for 10,000 employees at ACME org (currently on Excels). See `docs/REQUIREMENTS.md` first — it was written before any code.

**Stack:** Node.js 24 + TypeScript + Express + `pg` + PostgreSQL 16 (backend), React + Vite + TypeScript + Tailwind CSS (frontend). Tests: Vitest + Supertest.

## Quick start
```bash
# 1. Database (needs Docker, or a local Postgres 16)
docker compose up -d
# 2. Backend
cd backend && cp .env.example .env && npm install
npm run migrate   # psql $DATABASE_URL -f migrations/001_init.sql
npm run seed                         # exactly 10,000 employees
npm run dev                          # http://localhost:4000
# 3. Frontend (new terminal)
cd frontend && npm install && npm run dev   # http://localhost:5173
```

## API (summary)
- `GET /api/health`
- `GET /api/employees?search=&department=&country=&level=&sortBy=&sortOrder=&page=&pageSize=`
- `GET /api/employees/:id` (with salary history)
- `POST /api/employees`
- `PATCH /api/employees/:id/salary` — `{ newSalary, reason }`, writes a SalaryHistory row
- `GET /api/analytics/summary`
- `GET /api/employees/export?format=csv`

Full details: `docs/ARCHITECTURE.md`, `docs/TRADEOFFS.md`, `docs/PERFORMANCE.md`.

## Tests
```bash
cd backend && npm test
cd frontend && npm run build   # + npm test
```

Live-SQL verification without a Postgres server (migration + 10,000 seed + HTTP smoke test against pg-mem):
```bash
cd backend && npx tsx scripts/verify-pgmem.ts
```

## Docs for the reviewer
- `docs/REQUIREMENTS.md` — one-page requirements (written first)
- `docs/ARCHITECTURE.md` — layers, request flow, salary-change flow
- `docs/TRADEOFFS.md` — every major decision + what was rejected + next improvements
- `docs/PERFORMANCE.md` — how 10,000 rows stay fast
- `docs/AI-USAGE.md` — how AI was used, prompts, what was verified by hand

## Out of scope (deliberate)
Payroll/tax, auth/RBAC, leave/attendance, live FX conversion, AI chatbot — reasons in `docs/REQUIREMENTS.md`.
