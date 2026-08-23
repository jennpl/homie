import pg from "pg";
import { requireEnv } from "../config/env.js";

let pool: pg.Pool | undefined;

export function getPool(): pg.Pool {
  pool ??= new pg.Pool({ connectionString: requireEnv("DATABASE_URL") });
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) await pool.end();
  pool = undefined;
}
