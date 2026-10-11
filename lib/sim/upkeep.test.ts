import assert from "node:assert/strict";
import test from "node:test";
import { applyUpkeep, weeklyBills } from "./upkeep";

test("a heated box room week is rent plus bills", () => {
  assert.equal(weeklyBills(18_000, true, false), 18_000 + 1_200 + 800 + 500);
  const result = applyUpkeep(40_000, 1, 0, 18_000, true, false);
  assert.equal(result.missed, false);
  assert.equal(result.nextBalance, 40_000 - 20_500);
});

test("sofa surfing skips rent and overdraft has daily interest", () => {
  const sofa = applyUpkeep(5_000, 1, 0, 18_000, false, true);
  assert.equal(sofa.total, 400 + 800 + 500);
  const interest = applyUpkeep(-1_000, 0, 2, 18_000, true, false);
  assert.equal(interest.interest, 40);
  assert.equal(interest.nextBalance, -1_040);
});

test("missing rent stops at the overdraft floor", () => {
  const broke = applyUpkeep(0, 1, 0, 18_000, true, false);
  assert.equal(broke.missed, true);
  assert.equal(broke.nextBalance, -20_000);
});
