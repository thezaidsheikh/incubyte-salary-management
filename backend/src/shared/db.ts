import { Pool } from "pg";

/**
 * Create a Postgres connection pool for the given connection string.
 * Why a factory: tests and scripts build their own pool (pg-mem, or a
 * throwaway database) instead of sharing the process-wide default pool.
 * @param connectionString Postgres URL; defaults to DATABASE_URL.
 * @returns A new pool that logs idle-client errors instead of crashing.
 */
export function createPool(connectionString: string | undefined = process.env.DATABASE_URL): Pool {
  const pool = new Pool({ connectionString });
  pool.on("error", (err) => console.error("Postgres pool error:", err.message));
  return pool;
}

/**
 * Process-wide default pool, built from DATABASE_URL.
 * The composition root (app.ts) uses this unless a repository is injected.
 */
export const pool: Pool = createPool();
