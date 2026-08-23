import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { closePool, getPool } from "../src/db/pool.js";

const pool = getPool();
try {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const directory = path.resolve("db/migrations");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    const applied = await pool.query("SELECT 1 FROM schema_migrations WHERE name = $1", [file]);
    if (applied.rowCount) continue;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(await readFile(path.join(directory, file), "utf8"));
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`Applied ${file}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
} finally {
  await closePool();
}
