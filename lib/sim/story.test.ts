import assert from "node:assert/strict";
import test from "node:test";
import { normaliseAppearance } from "./appearance";
import { jobLocked, levelAfter, shiftWage, titleFor } from "./career";
import { checkChance, fillTemplate, pickEvent } from "./events";
import { goalReady, nextGoal } from "./goals";
import { missingHome, timeBackHome } from "./home";
import type { EventDef, GoalDef, JobDef, Nationality } from "./types";

const goals: GoalDef[] = [
  { id: "eat", title: "Eat", hint: "", emoji: "", stat: "eat", count: 1, rewardPence: 500, highlight: "" },
  { id: "job", title: "Job", hint: "", emoji: "", stat: "job", count: 1, rewardPence: 1000, highlight: "" },
];

test("goals run in order and need their stat", () => {
  assert.equal(nextGoal(goals, [])?.id, "eat");
  assert.equal(nextGoal(goals, ["eat"])?.id, "job");
  assert.equal(nextGoal(goals, ["eat", "job"]), null);
  const first = goals[0];
  assert.ok(first);
  assert.equal(goalReady(first, {}), false);
  assert.equal(goalReady(first, { eat: 1 }), true);
});

const nigeria: Nationality = {
  id: "nigeria",
  iso: "ng",
  label: "Nigeria",
  demonym: "Nigerian",
  flag: "🇳🇬",
  greeting: "How far?",
  dish: "jollof rice",
  dishEmoji: "🍛",
  utcOffset: 1,
  callHome: "",
};

test("events filter by venue and heritage, and fill in the player's country", () => {
  const events: EventDef[] = [
    { id: "a", title: "", emoji: "", text: "", venues: ["pub"], choices: [] },
    { id: "b", title: "", emoji: "", text: "Are you {demonym}?", venues: ["*"], heritage: true, choices: [] },
  ];
  assert.equal(pickEvent(events, "camden", false, 0), null);
  assert.equal(pickEvent(events, "camden", true, 0)?.id, "b");
  assert.equal(pickEvent(events, "pub", false, 0.99)?.id, "a");
  assert.equal(fillTemplate("Are you {demonym}? Say {greeting}", nigeria), "Are you Nigerian? Say How far?");
});

test("skill checks get easier with skill but never certain", () => {
  assert.ok(checkChance(3, 1) > checkChance(0, 1));
  assert.equal(checkChance(10, 0), 0.95);
  assert.equal(checkChance(0, 5), 0.1);
});

const barista: JobDef = {
  id: "barista",
  name: "Barista",
  emoji: "☕",
  venue: "shoreditch_coffee",
  payPerHourPence: 1000,
  hours: 4,
  skill: "coding",
  skillRequired: 2,
  energyCost: 30,
  xpSkill: "charisma",
  tips: false,
  ladder: ["Trainee", "Barista", "Head"],
};

test("careers level up every three shifts and pay more", () => {
  assert.equal(levelAfter(barista, 2), 0);
  assert.equal(levelAfter(barista, 3), 1);
  assert.equal(levelAfter(barista, 99), 2);
  assert.equal(titleFor(barista, 1), "Barista");
  assert.equal(shiftWage(barista, 0, 50), 4000);
  assert.equal(shiftWage(barista, 1, 50), 4600);
  assert.equal(jobLocked(barista, { coding: 1 }), true);
  assert.equal(jobLocked(barista, { coding: 2 }), false);
});

test("home clock shifts by the country's offset", () => {
  assert.equal(timeBackHome(8 * 60, 1).label, "Mon 09:00");
  assert.equal(timeBackHome(23 * 60, 8).label, "Tue 07:00");
  assert.equal(timeBackHome(23 * 60, 8).dayDelta, 1);
  assert.equal(timeBackHome(2 * 60, -5).label, "Sun 21:00");
  assert.equal(missingHome(0, 3 * 1440 - 1), false);
  assert.equal(missingHome(0, 3 * 1440), true);
});

test("old v1 appearance saves still load", () => {
  const look = normaliseAppearance({ body: "b", skin: "#8d5524", hair: "short", top: "#b23a48" });
  assert.equal(look.build, "slim");
  assert.equal(look.hairStyle, "short");
  assert.equal(look.skin, "#8d5524");
  assert.equal(look.headwear, "none");
  assert.equal(normaliseAppearance({ skin: "red" }).skin, "#c68642");
});
