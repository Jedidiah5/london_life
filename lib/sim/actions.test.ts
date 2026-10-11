import assert from "node:assert/strict";
import test from "node:test";
import { actionBlocker, makeAction, tickAction } from "./actions";
import { fullNeeds } from "./needs";
import type { ActionDef } from "./types";

const sleep: ActionDef = {
  id: "sleep",
  label: "Sleep",
  emoji: "😴",
  minutes: 60,
  costPence: 0,
  effects: { energy: 60 },
  anim: "sleep",
  scales: true,
};

const pint: ActionDef = {
  id: "pint",
  label: "A pint",
  emoji: "🍺",
  minutes: 10,
  costPence: 650,
  effects: { fun: 20, bladder: -10 },
  anim: "eat",
  venue: "pub",
};

test("an action spreads its total effect across the duration and then ends", () => {
  const halfway = tickAction(makeAction(sleep, 1, "nap"), fullNeeds(10), 30);
  assert.ok(halfway.action);
  assert.equal(halfway.needs.energy, 40);
  const done = tickAction(halfway.action, halfway.needs, 30);
  assert.equal(done.action, null);
  assert.equal(done.needs.energy, 70);
});

test("one action can move several needs, up and down", () => {
  const needs = { ...fullNeeds(50), fun: 50, bladder: 50 };
  const done = tickAction(makeAction(pint), needs, 10);
  assert.equal(done.needs.fun, 70);
  assert.equal(done.needs.bladder, 40);
});

test("a better bed restores faster, but quality never boosts a penalty", () => {
  const basic = tickAction(makeAction(sleep, 1), fullNeeds(0), 10);
  const better = tickAction(makeAction(sleep, 1.5), fullNeeds(0), 10);
  assert.ok(better.needs.energy > basic.needs.energy);
  const scaledPint = makeAction({ ...pint, scales: true }, 2);
  assert.equal(scaledPint.rates.bladder, -1);
});

test("the blocker mirrors the server rules", () => {
  const ctx = { balancePence: 0, skills: {}, location: "pub" };
  assert.equal(actionBlocker(pint, ctx), null);
  assert.equal(actionBlocker(pint, { ...ctx, balancePence: -19_500 }), "Not enough money");
  assert.equal(actionBlocker(pint, { ...ctx, location: "camden" }), "Not here");
  assert.equal(actionBlocker(sleep, ctx), "Only at home");
  const gated = { ...sleep, requires: { skill: "coding", level: 2 } };
  assert.equal(actionBlocker(gated, { ...ctx, location: "home" }), "Need Coding 2");
});
