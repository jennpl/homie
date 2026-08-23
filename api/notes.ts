import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../src/app.js";
import { requireEnv } from "../src/config/env.js";
import { authorize, json, readJson } from "../src/http.js";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== "POST") return json(response, 405, { error: "Method not allowed" });
  if (!authorize(request)) return json(response, 401, { error: "Unauthorized" });
  try {
    const body = await readJson(request);
    if (typeof body.text !== "string" || typeof body.authorId !== "string") {
      return json(response, 400, { error: "text and authorId are required" });
    }
    const result = await createApp().appendAndOrganize({
      householdId: requireEnv("HOMIE_HOUSEHOLD_ID"),
      authorId: body.authorId,
      text: body.text,
      receivedAt: typeof body.receivedAt === "string" ? body.receivedAt : new Date().toISOString(),
      sourceProvider: "manual",
      sourceExternalId: typeof body.sourceExternalId === "string" ? body.sourceExternalId : undefined,
    });
    return json(response, result.appended.created ? 201 : 200, result);
  } catch (error) {
    return json(response, 500, { error: error instanceof Error ? error.message : "Unknown error" });
  }
}
