import type { OrganizationNote } from "../contracts/notes.js";
import type { OrganizationSnapshot, OrganizeInput } from "../contracts/organization.js";
import { validateWindow } from "../core/dates.js";
import type { GenerateOrganization } from "./openai-organizer.js";
import { PROMPT_VERSION } from "./openai-organizer.js";

export type OrganizationStore = {
  listNotes(householdId: string, startDate: string, endDateExclusive: string): Promise<OrganizationNote[]>;
  saveSnapshot(input: OrganizeInput & {
    result: Awaited<ReturnType<GenerateOrganization>>["result"];
    sourceNoteIds: string[];
    model: string;
    promptVersion: string;
    usage: unknown;
  }): Promise<OrganizationSnapshot>;
};

export function createOrganize(store: OrganizationStore, generate: GenerateOrganization) {
  return async (input: OrganizeInput): Promise<OrganizationSnapshot> => {
    validateWindow(input.window);
    const notes = await store.listNotes(
      input.householdId,
      input.window.startDate,
      input.window.endDateExclusive,
    );
    if (notes.length === 0) throw new Error("No notes found in organization window");

    const generated = await generate(notes, input.window);
    const sourceNoteIds = [...new Set([
      ...generated.result.summary.sourceNoteIds,
      ...generated.result.planItems.flatMap((item) => item.sourceNoteIds),
    ])];
    return store.saveSnapshot({
      ...input,
      result: generated.result,
      sourceNoteIds,
      model: generated.model,
      promptVersion: PROMPT_VERSION,
      usage: generated.usage,
    });
  };
}
