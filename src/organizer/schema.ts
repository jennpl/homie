import type { OrganizationResult } from "../contracts/organization.js";

export const ORGANIZATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: {
      type: "object",
      additionalProperties: false,
      properties: {
        text: { type: "string" },
        sourceNoteIds: { type: "array", items: { type: "string" } },
      },
      required: ["text", "sourceNoteIds"],
    },
    planItems: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          details: { type: "string" },
          status: { type: "string", enum: ["action", "information"] },
          sourceNoteIds: { type: "array", items: { type: "string" } },
        },
        required: ["title", "details", "status", "sourceNoteIds"],
      },
    },
    digestText: { type: "string" },
  },
  required: ["summary", "planItems", "digestText"],
} as const;

export function validateOrganization(value: unknown, allowedNoteIds: Set<string>): OrganizationResult {
  if (!isRecord(value) || !isRecord(value.summary) || !Array.isArray(value.planItems)) {
    throw new Error("Organizer returned an invalid result shape");
  }
  if (typeof value.summary.text !== "string" || !isStringArray(value.summary.sourceNoteIds)) {
    throw new Error("Organizer returned an invalid summary");
  }
  if (typeof value.digestText !== "string") throw new Error("Organizer returned an invalid digest");

  const planItems = value.planItems.map((item) => {
    if (!isRecord(item) || typeof item.title !== "string" ||
        typeof item.details !== "string" ||
        (item.status !== "action" && item.status !== "information") ||
        !isStringArray(item.sourceNoteIds)) {
      throw new Error("Organizer returned an invalid plan item");
    }
    return {
      title: item.title,
      details: item.details,
      status: item.status as "action" | "information",
      sourceNoteIds: item.sourceNoteIds,
    };
  });

  const references = [...value.summary.sourceNoteIds, ...planItems.flatMap((item) => item.sourceNoteIds)];
  for (const id of references) {
    if (!allowedNoteIds.has(id)) throw new Error(`Organizer cited unknown note: ${id}`);
  }
  if (value.summary.text && value.summary.sourceNoteIds.length === 0) {
    throw new Error("Non-empty summary must cite at least one note");
  }
  for (const item of planItems) {
    if (item.sourceNoteIds.length === 0) throw new Error("Every plan item must cite a note");
  }

  return {
    summary: { text: value.summary.text, sourceNoteIds: value.summary.sourceNoteIds },
    planItems,
    digestText: value.digestText,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
