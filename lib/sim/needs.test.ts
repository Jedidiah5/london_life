import assert from "node:assert/strict";
import test from "node:test";
import { bumpNeed, decayNeeds, fullNeeds, warningsFor } from "./needs";

test("hunger drops by 4 per game hour", () => {
  const next = decayNeeds(fullNeeds(80), 1, false);
  assert.equal(next.hunger, 76);
  assert.equal(next.hygiene, 77.5);
  assert.equal(next.bladder, 75);
  assert.equal(next.energy, 77);
  assert.equal(next.fun, 67);
  assert.equal(next.social, 58);
});

test("work doubles energy decay", () => {
  const resting = decayNeeds(fullNeeds(80), 1, false);
  const working = decayNeeds(fullNeeds(80), 1, true);
  assert.equal(resting.energy, 77);
  assert.equal(working.energy, 74);
});

test("needs stay inside 0 to 100", () => {
  const drained = decayNeeds(fullNeeds(0), 10, true);
  assert.equal(drained.hunger, 0);
  assert.equal(bumpNeed(fullNeeds(95), "fun", 20).fun, 100);
});

test("warns once a need crosses 25", () => {
  const prev = fullNeeds(30);
  const next = { ...prev, bladder: 20 };
  assert.deepEqual(warningsFor(prev, next), ["bladder"]);
});
