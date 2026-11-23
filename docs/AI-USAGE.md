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

## What was verified by hand (not trusted from AI)
- `npm test` in backend (17 tests) and frontend (2 tests) — run, green.
- `npm run build` in both packages — run, green.
- Seed count and determinism — asserted in tests (`generateEmployees(10000, 42)` = 10,000 unique emails; same seed = same output).
- Salary audit — API test asserts a PATCH creates exactly one history row with old + new values.
- The Prisma → `pg` pivot: Prisma's engine binaries could not be downloaded in this VM (`binaries.prisma.sh` returned 404 via the egress proxy, verified with curl). The decision was to switch the data layer to `pg` (same Postgres, same schema/indexes, same repository interface) rather than pretend Prisma worked. See `docs/TRADEOFFS.md`.

## What AI did not do
- No feature was added that is not in the requirements doc.
- No test was written to pass without asserting real behaviour.
- No credentials, no deployment, and no email were sent by AI.
