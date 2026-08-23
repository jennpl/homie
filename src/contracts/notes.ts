export type Note = {
  id: string;
  householdId: string;
  authorId: string;
  text: string;
  receivedAt: string;
  localDate: string;
};

export type OrganizationNote = Note & {
  authorName: string;
};

export type NoteCreatedV1 = {
  type: "note.created";
  version: 1;
  noteId: string;
};

export type AppendNoteInput = {
  householdId: string;
  authorId: string;
  text: string;
  receivedAt: string;
  sourceProvider: "manual" | "fixture" | "twilio";
  sourceExternalId: string;
};

export type AppendNoteResult = {
  note: Note;
  created: boolean;
  event?: NoteCreatedV1;
};

export type AppendNote = (input: AppendNoteInput) => Promise<AppendNoteResult>;
