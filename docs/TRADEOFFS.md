# Trade-offs

| Decision | Chosen | Why | Alternative + why not |
|---|---|---|---|
| DB | PostgreSQL 16 | Relational, correct for salary + audit; indexes, transactions, aggregates. The brief asks for a relational DB. | SQLite — zero-setup, but no concurrent writes, weaker types; only a local fallback, never the design target. MongoDB — wrong shape for joins/audit. |
| Backend | Express + TypeScript | Light, familiar, fast to build well; layered code keeps it maintainable. | NestJS — more structure out of the box, but heavier boilerplate for this size; Express + strict layering gives the same discipline with less ceremony. |
| ORM / DB driver | `pg` (node-postgres) + plain SQL migration | No binary downloads, standard driver, full SQL control; the repository interface means swapping back to Prisma later is a one-file change. | Prisma — first choice, but its engine binaries download from `binaries.prisma.sh`, which is unreachable from this VM (verified: curl returns Cloudflare 404, `prisma generate` fails with ECONNRESET). Kept the same schema, indexes and interface, so nothing else in the app changed. |
| Frontend | React + Vite + Tailwind | Matches the role stack; Vite is fast; Tailwind keeps UI consistent without a heavy component lib. | Next.js — SSR adds nothing for an internal HR tool; Vite SPA is simpler to deploy. |
| Pagination | Server-side, default 20, max 100 | 10,000 rows must never hit the browser at once. | Client-side — simple but slow and memory-heavy at 10k. |
| Salary storage | Current salary on Employee + SalaryHistory audit | Fast reads for list/dashboard; history is the audit truth. | History-only (compute current from latest) — correct but slower for every list row. |
| Analytics | Grouped SQL + in-memory median/buckets | Medians need sorted values; aggregates are small, so this is fast and exact. | Precomputed materialised views — faster at 1M+ rows, overkill at 10k. |
| Charts | Plain tables + CSS bars | Deterministic, no extra dependency, accessible. | Chart lib — prettier, heavier; not needed to answer the pay questions. |
| Auth | None (documented out of scope) | Single HR persona in the brief; focus the effort on the core. | JWT/RBAC — would be the next step before real production use. |

## What I would improve next (honest)
1. Auth + RBAC (HR admin vs viewer) and `changedBy` from the real user.
2. Salary-change approval flow for large increases.
3. Materialised analytics + caching if headcount grows past ~100k.
4. Pay-band config in the DB instead of in the seed.
