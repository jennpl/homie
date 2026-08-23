import assert from "node:assert/strict";
import test from "node:test";
import { dayWindow, localDateFor } from "../src/core/dates.js";

test("assigns a UTC instant to the household local date", () => {
  assert.equal(localDateFor(new Date("2026-08-24T02:00:00Z"), "America/New_York"), "2026-08-23");
});

test("builds an exclusive day window", () => {
  assert.deepEqual(dayWindow("2026-08-23"), {
    kind: "day",
    startDate: "2026-08-23",
    endDateExclusive: "2026-08-24",
  });
});
