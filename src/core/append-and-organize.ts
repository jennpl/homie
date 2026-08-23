import type { AppendNote, AppendNoteInput } from "../contracts/notes.js";
import type { OrganizationSnapshot, OrganizeInput } from "../contracts/organization.js";
import { dayWindow } from "./dates.js";

export type Organize = (input: OrganizeInput) => Promise<OrganizationSnapshot>;

export function createAppendAndOrganize(appendNote: AppendNote, organize: Organize) {
  return async (input: AppendNoteInput) => {
    const appended = await appendNote(input);
    if (!appended.created) return { appended, snapshot: undefined };

    // The note is already committed here. An organizer failure is intentionally
    // allowed to surface without undoing ingestion; callers can retry organize.
    const snapshot = await organize({
      householdId: appended.note.householdId,
      window: dayWindow(appended.note.localDate),
      reason: "note.created",
    });
    return { appended, snapshot };
  };
}
