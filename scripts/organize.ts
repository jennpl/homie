import { parseArgs } from "node:util";
import { createApp } from "../src/app.js";
import { requireEnv } from "../src/config/env.js";
import { dayWindow } from "../src/core/dates.js";
import { closePool } from "../src/db/pool.js";

const { values } = parseArgs({
  options: { date: { type: "string", short: "d" } },
});
if (!values.date) throw new Error("Usage: npm run organize -- --date YYYY-MM-DD");

try {
  const snapshot = await createApp().organizeWindow({
    householdId: requireEnv("HOMIE_HOUSEHOLD_ID"),
    window: dayWindow(values.date),
    reason: "manual",
  });
  console.log(JSON.stringify(snapshot, null, 2));
} finally {
  await closePool();
}
