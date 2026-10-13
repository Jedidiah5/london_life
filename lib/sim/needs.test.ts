import assert from "node:assert/strict";
import test from "node:test";
import { bumpNeed, decayNeeds, fullNeeds, warningsFor } from "./needs";

test("hunger drops by 1 per game hour", () => {
  const next = decayNeeds(fullNeeds(80), 1, false);
  assert.equal(next.hunger, 79);
  assert.equal(next.hygiene, 79.375);
  assert.equal(next.bladder, 78.75);
  assert.equal(next.energy, 79.25);
  assert.equal(next.fun, 69.25);
  assert.equal(next.social, 59.5);
});

test("work doubles energy decay", () => {
  const resting = decayNeeds(fullNeeds(80), 1, false);
  const working = decayNeeds(fullNeeds(80), 1, true);
  assert.equal(resting.energy, 79.25);
  assert.equal(working.energy, 78.5);
});

test("sleep halves decay and never drains energy", () => {
  const asleep = decayNeeds(fullNeeds(80), 2, false, true);
  assert.equal(asleep.energy, 80);
  assert.equal(asleep.hunger, 79);
  assert.equal(asleep.bladder, 78.75);
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
