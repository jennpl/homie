import assert from "node:assert/strict";
import test from "node:test";
import { validateOrganization } from "../src/organizer/schema.js";

test("accepts grounded organization output", () => {
  const result = validateOrganization({
    summary: { text: "Milk is needed.", sourceNoteIds: ["note-1"] },
    planItems: [{
      title: "Buy milk",
      details: "",
      status: "action",
      sourceNoteIds: ["note-1"],
    }],
    digestText: "Today: buy milk.",
  }, new Set(["note-1"]));
  assert.equal(result.planItems[0]?.title, "Buy milk");
});

test("rejects an invented source note", () => {
  assert.throws(() => validateOrganization({
    summary: { text: "Invented", sourceNoteIds: ["note-404"] },
    planItems: [],
    digestText: "Invented",
  }, new Set(["note-1"])), /unknown note/);
});
