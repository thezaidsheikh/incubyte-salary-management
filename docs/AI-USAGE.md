# How AI was used

This solution was built with an agentic AI assistant (Muse), as the assessment explicitly asks for intentional AI use. AI did not replace engineering judgment — every AI-produced decision below was checked against the brief and verified by running the code.

## What AI did
- Drafted the one-page requirements doc from the assessment brief, then it was reviewed against each line of the brief.
- Generated the repo scaffold, the layered backend, the seed generator, and the React pages from the requirements.
- Wrote the first draft of the tests; the failing ones (e.g. the INR formatting expectation) were fixed by reading the actual output, not by weakening the test.

## Prompts / instructions used (summary)
- "Build the Incubyte Salary Management assessment end-to-end, Node.js + TypeScript + Express + PostgreSQL, React + Vite, with a one-page requirements doc first, incremental git commits, deterministic seed of exactly 10,000 employees, salary changes always audited, server pagination, and fast deterministic tests."
- "Document every decision with WHY, not just WHAT, so the candidate can answer recruiter questions."
- "Keep scope tight: payroll, auth, leave and live FX are out — with reasons."
- Rework (23 Nov): "Migrate the frontend from Vite to Next.js (App Router) — the assessment allows ReactJS or NextJS and the user chose Next.js. Restructure the backend as a modular monolith (modules/employees, salary, analytics + shared kernel) so a module can later be extracted into a microservice. Coverage 90%+ (core 100%), JSDoc on every public method, design patterns/principles implemented and documented, README + docs complete, everything cross-verified. Keep the candidate in the loop with short gitignored notes (`zaid-notes/`) explaining every decision with an example."
- "Clarify EVERY point of the assessment document in `zaid-notes/09-assessment-points-clarified.md` — what the doc says, what it means, what was done for it (file/feature), and what to say if a recruiter asks. Mark honestly what is phase 2 (deployment + video demo)."

## What was verified by hand (not trusted from AI)
- `npm test` in backend (80 tests) and frontend (62 tests) — run, green.
  Coverage re-run after the rework: backend 99.73% lines / 98.97%
  branches / 100% functions; frontend 100% (see `docs/TESTING.md` for
  the exact gaps below 100%).
- `npm run build` in both packages — run, green (Next.js: 6 routes,
  First Load JS 90–99 kB).
- Seed count and determinism — asserted in tests (`generateEmployees(10000, 42)` = 10,000 unique emails; same seed = same output) and by
  `SELECT COUNT(*)` = 10,000 on real Postgres 16.
- Salary audit — API test asserts a PATCH creates exactly one history row with old + new values; smoke-tested live (11,700 → 999,999, 1 history row).
- The Prisma → `pg` pivot: Prisma's engine binaries could not be downloaded in this VM (`binaries.prisma.sh` returned 404 via the egress proxy, verified with curl). The decision was to switch the data layer to `pg` (same Postgres, same schema/indexes, same repository interface) rather than pretend Prisma worked. See `docs/TRADEOFFS.md`.
- The Vite → Next.js migration was verified the same way: `next build`,
  62 frontend tests, and an `next start` smoke test (all four routes 200).
- Every claim in `docs/VERIFICATION.md` was re-checked against the
  actual code and measured output on 23 Nov 2026 — no requirement is
  marked covered without a file or a number as evidence.

## What AI did not do
- No feature was added that is not in the requirements doc.
- No test was written to pass without asserting real behaviour.
- No credentials, no deployment, and no email were sent by AI.
