import assert from "node:assert/strict";
import test from "node:test";
import { makeAction, tickAction } from "./actions";
import { fullNeeds } from "./needs";

test("sleep restores energy across the action and then ends", () => {
  const action = makeAction("sleep", 1, "nap");
  const halfway = tickAction(action, fullNeeds(10), 30);
  assert.ok(halfway.action);
  assert.equal(halfway.needs.energy, 10 + 1.2 * 30);
  const done = tickAction(halfway.action, halfway.needs, 30);
  assert.equal(done.action, null);
  assert.equal(done.needs.energy, 10 + 72);
});

test("a better bed restores faster", () => {
  const basic = tickAction(makeAction("sleep", 1), fullNeeds(0), 10);
  const better = tickAction(makeAction("sleep", 1.5), fullNeeds(0), 10);
  assert.ok(better.needs.energy > basic.needs.energy);
});
