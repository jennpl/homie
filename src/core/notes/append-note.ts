import type { AppendNote, AppendNoteInput, AppendNoteResult } from "../../contracts/notes.js";
import { localDateFor } from "../dates.js";

export type NoteStore = {
  householdTimezone(householdId: string): Promise<string>;
  append(input: AppendNoteInput & { localDate: string }): Promise<AppendNoteResult>;
};

export function createAppendNote(store: NoteStore): AppendNote {
  return async (input) => {
    const text = input.text.trim();
    if (!text) throw new Error("Note text is required");
    if (text.length > 4000) throw new Error("Note text cannot exceed 4000 characters");

    const receivedAt = new Date(input.receivedAt);
    if (Number.isNaN(receivedAt.getTime())) throw new Error("receivedAt must be ISO-8601");

    const timezone = await store.householdTimezone(input.householdId);
    return store.append({
      ...input,
      text,
      receivedAt: receivedAt.toISOString(),
      localDate: localDateFor(receivedAt, timezone),
    });
  };
}
