import assert from "node:assert/strict";
import test from "node:test";
import { advanceClock, clockParts, weekIndex, weeksOwed } from "./clock";

test("speed multiplies real seconds into game minutes", () => {
  assert.equal(advanceClock(480, 2, 1), 482);
  assert.equal(advanceClock(480, 2, 3), 486);
  assert.equal(advanceClock(10, -5, 1), 10);
});

test("formats Monday morning as day 1", () => {
  const parts = clockParts(8 * 60);
  assert.equal(parts.day, 1);
  assert.equal(parts.hour, 8);
  assert.equal(parts.minute, 0);
  assert.equal(parts.label, "Day 1 · 08:00");
});

test("rent weeks land on Sunday midnight", () => {
  assert.equal(weekIndex(8639), 0);
  assert.equal(weekIndex(8640), 1);
  assert.equal(weekIndex(8640 + 10080), 2);
  assert.equal(weeksOwed(0, 480), 0);
  assert.equal(weeksOwed(0, 8640), 1);
  assert.equal(weeksOwed(8640, 8640 + 10080), 1);
});
