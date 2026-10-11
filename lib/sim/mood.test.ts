import assert from "node:assert/strict";
import test from "node:test";
import { moodBand, moodScore, wageMultiplier } from "./mood";
import { fullNeeds } from "./needs";

test("mood bands follow the spec thresholds", () => {
  assert.equal(moodBand(10), "Miserable");
  assert.equal(moodBand(30), "Low");
  assert.equal(moodBand(50), "Fine");
  assert.equal(moodBand(70), "Happy");
  assert.equal(moodBand(90), "Buzzing");
});

test("wage multiplier runs from 0.7 to 1.3", () => {
  assert.ok(Math.abs(wageMultiplier(0) - 0.7) < 0.001);
  assert.ok(Math.abs(wageMultiplier(100) - 1.3) < 0.001);
  assert.ok(Math.abs(wageMultiplier(50) - 1) < 0.001);
});

test("heating off and moodlets move the score", () => {
  const needs = fullNeeds(80);
  const withHeat = moodScore(needs, [], 0, true);
  const cold = moodScore(needs, [], 0, false);
  assert.equal(cold, withHeat - 15);
  const rained = moodScore(
    needs,
    [{ id: "rain", label: "Got rained on", emoji: "🌧️", value: -10, expiresAtGameMinute: 50 }],
    10,
    true,
  );
  assert.equal(rained, withHeat - 10);
});
