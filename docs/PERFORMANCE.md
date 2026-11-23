# Performance — how 10,000 rows stay fast

## The rule
Never move 10,000 rows to the browser or hold them all in server memory when a page only shows 20.

## What was done
1. **Server pagination** — `GET /api/employees` defaults to 20 rows, max 100. The list query is one `SELECT … LIMIT 20 OFFSET …` plus one `COUNT(*)`. Measured shape: 500 pages at 20/page.
2. **Indexes** (in `backend/migrations/001_init.sql`) — `department`, `country`, `level`, `base_salary`, `(last_name, first_name)`, and `salary_history(employee_id, changed_at)`. Each index matches a real filter/sort the UI sends.
3. **Search is indexed ILIKE** on first/last name and email — one query, no full scan of all columns.
4. **Analytics in one pass** — one `SELECT department, country, level, base_salary, currency` (5 small columns, 10k rows) then medians/buckets computed in memory. At 10k rows this is milliseconds; the alternative (a query per group) would be ~30 round-trips.
5. **CSV export streams** — rows are written to the response in pages of 1,000; the whole export is never held in memory at once.
6. **Seed is batched** — 10 batches of 1,000 multi-row inserts, not 10,000 single inserts.
7. **Frontend debounces search** (250 ms) so typing does not fire a request per keystroke.

## What was deliberately not done
- No Redis/cache layer: at 10k rows Postgres answers these queries directly; a cache would add a service and stale-data risk for no measurable gain.
- No materialised views: same reason — revisit past ~100k employees.
- No chart library: CSS bars keep the Next.js First Load JS at 90–99 kB
  per route (was ~185 kB JS / 59 kB gzip in the Vite build).

## Measured (real PostgreSQL 16, this VM, 23 Nov 2026 — re-measured after the rework)
- Seed: exactly 10,000 employees in 0.7–0.9 s (10 batches of 1,000).
- `GET /api/health`: 200 in ~12 ms.
- `GET /api/employees/export`: 10,001 lines (header + 10,000 rows) in ~0.26 s.
- `GET /api/analytics/summary`: 10,000 employees, avg USD 4,555, median USD 3,587.
- pg-mem verification (no server): same seed took 22 s — emulator overhead, not Postgres.
- Next.js production build: 6 routes, First Load JS 90–99 kB per route.

## How to verify
```bash
# list timing (should be well under a second on local Postgres)
curl -w "time=%{time_total}s\n" "http://localhost:4000/api/employees?page=1&pageSize=20"
curl -w "time=%{time_total}s\n" "http://localhost:4000/api/analytics/summary"
# explain a filtered query in psql
EXPLAIN ANALYZE SELECT * FROM employees WHERE department='Engineering' ORDER BY last_name LIMIT 20;
```
