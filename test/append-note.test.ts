import assert from "node:assert/strict";
import test from "node:test";
import type { AppendNoteResult } from "../src/contracts/notes.js";
import { createAppendNote, type NoteStore } from "../src/core/notes/append-note.js";

test("appendNote normalizes text and assigns the household local date", async () => {
  let captured: Parameters<NoteStore["append"]>[0] | undefined;
  const expected = { created: true } as AppendNoteResult;
  const appendNote = createAppendNote({
    async householdTimezone() { return "America/New_York"; },
    async append(input) { captured = input; return expected; },
  });
  assert.equal(await appendNote({
    householdId: "tony-test",
    authorId: "tony",
    text: "  Buy milk  ",
    receivedAt: "2026-08-24T02:00:00Z",
    sourceProvider: "fixture",
    sourceExternalId: "fixture-1",
  }), expected);
  assert.equal(captured?.text, "Buy milk");
  assert.equal(captured?.localDate, "2026-08-23");
});
