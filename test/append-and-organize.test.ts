import assert from "node:assert/strict";
import test from "node:test";
import type { AppendNoteResult, Note } from "../src/contracts/notes.js";
import type { OrganizationSnapshot, OrganizeInput } from "../src/contracts/organization.js";
import { createAppendAndOrganize } from "../src/core/append-and-organize.js";

const note: Note = {
  id: "36eaa40a-6126-41d2-812f-9f5c8206024a",
  householdId: "tony-test",
  authorId: "tony",
  text: "Buy milk",
  receivedAt: "2026-08-23T15:00:00.000Z",
  localDate: "2026-08-23",
};

test("a newly created note triggers its day organization once", async () => {
  let calls = 0;
  const append = async (): Promise<AppendNoteResult> => ({ note, created: true });
  const organize = async (input: OrganizeInput) => {
    calls += 1;
    assert.equal(input.reason, "note.created");
    assert.equal(input.window.startDate, note.localDate);
    return {} as OrganizationSnapshot;
  };
  const result = await createAppendAndOrganize(append, organize)({
    householdId: note.householdId,
    authorId: note.authorId,
    text: note.text,
    receivedAt: note.receivedAt,
    sourceProvider: "fixture",
    sourceExternalId: "new-1",
  });
  assert.equal(calls, 1);
  assert.ok(result.snapshot);
});

test("a duplicate note skips organization", async () => {
  let calls = 0;
  const append = async (): Promise<AppendNoteResult> => ({ note, created: false });
  const result = await createAppendAndOrganize(append, async () => {
    calls += 1;
    return {} as OrganizationSnapshot;
  })({
    householdId: note.householdId,
    authorId: note.authorId,
    text: note.text,
    receivedAt: note.receivedAt,
    sourceProvider: "fixture",
    sourceExternalId: "duplicate-1",
  });
  assert.equal(calls, 0);
  assert.equal(result.snapshot, undefined);
});

test("an organizer failure happens after the note is committed", async () => {
  let persisted = false;
  const append = async (): Promise<AppendNoteResult> => {
    persisted = true;
    return { note, created: true };
  };
  await assert.rejects(
    createAppendAndOrganize(append, async () => { throw new Error("OpenAI unavailable"); })({
      householdId: note.householdId,
      authorId: note.authorId,
      text: note.text,
      receivedAt: note.receivedAt,
      sourceProvider: "fixture",
      sourceExternalId: "failure-1",
    }),
    /OpenAI unavailable/,
  );
  assert.equal(persisted, true);
});
