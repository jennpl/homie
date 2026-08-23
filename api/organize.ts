import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../src/app.js";
import { requireEnv } from "../src/config/env.js";
import { dayWindow } from "../src/core/dates.js";
import { authorize, json, readJson } from "../src/http.js";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== "POST") return json(response, 405, { error: "Method not allowed" });
  if (!authorize(request)) return json(response, 401, { error: "Unauthorized" });
  try {
    const body = await readJson(request);
    if (typeof body.localDate !== "string") {
      return json(response, 400, { error: "localDate is required" });
    }
    const snapshot = await createApp().organizeWindow({
      householdId: requireEnv("HOMIE_HOUSEHOLD_ID"),
      window: dayWindow(body.localDate),
      reason: "manual",
    });
    return json(response, 201, snapshot);
  } catch (error) {
    return json(response, 500, { error: error instanceof Error ? error.message : "Unknown error" });
  }
}
