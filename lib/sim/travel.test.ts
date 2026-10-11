import assert from "node:assert/strict";
import test from "node:test";
import { formatPence } from "./money";
import { travelQuote } from "./travel";

test("formats pence only at the edges", () => {
  assert.equal(formatPence(40_000), "£400.00");
  assert.equal(formatPence(123_456), "£1,234.56");
  assert.equal(formatPence(-50), "-£0.50");
});

test("tube, bus, walk, and ride quotes", () => {
  const tube = travelQuote(4, 1, "tube");
  assert.equal(tube.pence, 160 * 3);
  assert.equal(tube.paysWith, "oyster");
  assert.equal(travelQuote(2, 2, "tube").pence, 280);
  assert.equal(travelQuote(2, 1, "bus").pence, 175);
  assert.equal(travelQuote(4, 1, "walk").pence, 0);
  assert.equal(travelQuote(4, 1, "ride").pence, 650 + 3 * 200);
});
