import { parseArgs } from "node:util";
import { createApp } from "../src/app.js";
import { requireEnv } from "../src/config/env.js";
import { closePool } from "../src/db/pool.js";

const { values } = parseArgs({
  options: {
    text: { type: "string", short: "t" },
    author: { type: "string", short: "a", default: "tony" },
    "source-id": { type: "string" },
  },
});
if (!values.text) throw new Error("Usage: npm run note:add -- --text \"Buy milk\" [--author tony]");

try {
  const result = await createApp().appendAndOrganize({
    householdId: requireEnv("HOMIE_HOUSEHOLD_ID"),
    authorId: values.author!,
    text: values.text,
    receivedAt: new Date().toISOString(),
    sourceProvider: "manual",
    sourceExternalId: values["source-id"],
  });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await closePool();
}
