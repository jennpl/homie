import type { IncomingMessage, ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { requireEnv } from "./config/env.js";

export function authorize(request: IncomingMessage): boolean {
  const expected = Buffer.from(`Bearer ${requireEnv("HOMIE_INTERNAL_API_KEY")}`);
  const actual = Buffer.from(request.headers.authorization ?? "");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 16_384) throw new Error("Request body is too large");
    chunks.push(buffer);
  }
  const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("JSON body must be an object");
  }
  return value as Record<string, unknown>;
}

export function json(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}
