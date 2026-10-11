import assert from "node:assert/strict";
import test from "node:test";
import { bumpNeed, decayNeeds, fullNeeds, warningsFor } from "./needs";

test("hunger drops by 2 per game hour", () => {
  const next = decayNeeds(fullNeeds(80), 1, false);
  assert.equal(next.hunger, 78);
  assert.equal(next.hygiene, 78.75);
  assert.equal(next.bladder, 77.5);
  assert.equal(next.energy, 78.5);
  assert.equal(next.fun, 68.5);
  assert.equal(next.social, 59);
});

test("work doubles energy decay", () => {
  const resting = decayNeeds(fullNeeds(80), 1, false);
  const working = decayNeeds(fullNeeds(80), 1, true);
  assert.equal(resting.energy, 78.5);
  assert.equal(working.energy, 77);
});

test("sleep halves decay and never drains energy", () => {
  const asleep = decayNeeds(fullNeeds(80), 2, false, true);
  assert.equal(asleep.energy, 80);
  assert.equal(asleep.hunger, 78);
  assert.equal(asleep.bladder, 77.5);
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
