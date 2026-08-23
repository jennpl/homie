import OpenAI from "openai";
import type { OrganizationNote } from "../contracts/notes.js";
import type { OrganizationResult, OrganizationWindow } from "../contracts/organization.js";
import { ORGANIZATION_SCHEMA, validateOrganization } from "./schema.js";

export const PROMPT_VERSION = "organization-v1";

export type AiOrganization = {
  result: OrganizationResult;
  model: string;
  usage: unknown;
};

export type GenerateOrganization = (
  notes: OrganizationNote[],
  window: OrganizationWindow,
) => Promise<AiOrganization>;

export function createOpenAiOrganizer(options: {
  apiKey: string;
  model: string;
}): GenerateOrganization {
  const client = new OpenAI({ apiKey: options.apiKey });
  return async (notes, window) => {
    const response = await client.responses.create({
      model: options.model,
      store: false,
      instructions: [
        "Organize private household notes into a concise summary and practical plan.",
        "Use only facts in the supplied notes. Resolve corrections by favoring later notes.",
        "Every summary and plan item must cite the exact source note IDs.",
        "Digest text must be short, readable as an SMS, and grounded in the cited content.",
      ].join(" "),
      input: JSON.stringify({ window, notes }),
      text: {
        format: {
          type: "json_schema",
          name: "homie_organization",
          strict: true,
          schema: ORGANIZATION_SCHEMA,
        },
      },
    });
    if (!response.output_text) throw new Error("OpenAI returned no organization output");
    const parsed: unknown = JSON.parse(response.output_text);
    return {
      result: validateOrganization(parsed, new Set(notes.map((note) => note.id))),
      model: response.model,
      usage: response.usage,
    };
  };
}
