import { readFile } from "node:fs/promises";
import path from "node:path";
import { closePool, getPool } from "../src/db/pool.js";

const pool = getPool();
try {
  await pool.query(await readFile(path.resolve("db/seed.sql"), "utf8"));
  console.log("Seeded tony-test, partner-test, and shared-demo");
} finally {
  await closePool();
}
