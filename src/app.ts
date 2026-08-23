import { randomUUID } from "node:crypto";
import { requireEnv } from "./config/env.js";
import type { AppendNoteInput } from "./contracts/notes.js";
import type { OrganizeInput } from "./contracts/organization.js";
import { createAppendAndOrganize } from "./core/append-and-organize.js";
import { createAppendNote } from "./core/notes/append-note.js";
import { getPool } from "./db/pool.js";
import { PostgresStore } from "./db/postgres-store.js";
import { createOpenAiOrganizer } from "./organizer/openai-organizer.js";
import { createOrganize } from "./organizer/organize.js";

export function createApp() {
  const { store, appendNote } = createNoteService();
  const organize = createOrganize(store, createOpenAiOrganizer({
    apiKey: requireEnv("OPENAI_API_KEY"),
    model: requireEnv("OPENAI_MODEL"),
  }));
  const appendAndOrganize = createAppendAndOrganize(appendNote, organize);

  return {
    appendNote,
    organize,
    async appendAndOrganize(input: Omit<AppendNoteInput, "sourceExternalId"> & {
      sourceExternalId?: string;
    }) {
      return appendAndOrganize({
        ...input,
        sourceExternalId: input.sourceExternalId ?? randomUUID(),
      });
    },
    async organizeWindow(input: OrganizeInput) {
      return organize(input);
    },
  };
}

// Twilio can use this without OPENAI_API_KEY. It persists/deduplicates the note
// and commits NoteCreatedV1 to the outbox; organization is a separate concern.
export function createNoteService() {
  const store = new PostgresStore(getPool());
  return { store, appendNote: createAppendNote(store) };
}
