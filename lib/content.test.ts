import assert from "node:assert/strict";
import test from "node:test";
import {
  actionsById,
  catalogue,
  events,
  homes,
  jobs,
  locals,
  menusById,
  nationalitiesById,
  venues,
  venuesById,
} from "./content";
import { SKILL_KEYS } from "./sim/constants";

test("every menu lists real actions", () => {
  for (const menu of Object.values(menusById)) {
    assert.ok(menu.actions.length > 0, `${menu.id} is empty`);
  }
});

test("catalogue items, fixtures and venue spots point at real menus", () => {
  const raw = catalogue.filter((item) => item.menu !== null);
  assert.ok(raw.length >= 20);
  for (const place of [...homes, ...venues]) {
    for (const fixture of place.fixtures) {
      if (fixture.menu) assert.ok(menusById[fixture.menu], `${place.id}/${fixture.id}`);
    }
  }
  for (const venue of venues.filter((entry) => entry.id !== "home")) {
    const spots = venue.fixtures.filter((fixture) => fixture.menu);
    assert.ok(spots.length >= 3, `${venue.id} needs 3+ spots`);
    assert.ok(venue.flavour.length >= 3, `${venue.id} needs flavour lines`);
  }
});

test("venue actions belong to a real venue and skills are real", () => {
  for (const action of Object.values(actionsById)) {
    if (action.venue) assert.ok(venuesById[action.venue], action.id);
    if (action.skill) assert.ok((SKILL_KEYS as readonly string[]).includes(action.skill), action.id);
    assert.ok(Number.isInteger(action.costPence) && action.costPence >= 0, action.id);
  }
});

test("events, jobs and locals reference real things", () => {
  for (const event of events) {
    for (const choice of event.choices) {
      if (choice.action) assert.ok(actionsById[choice.action]?.anywhere, `${event.id}: ${choice.action}`);
    }
  }
  for (const job of jobs) {
    assert.ok(venuesById[job.venue], job.id);
    assert.ok(job.ladder.length >= 2, job.id);
  }
  assert.ok(jobs.length >= 15);
  const origins = new Set(locals.map((local) => local.origin));
  for (const origin of origins) assert.ok(nationalitiesById[origin], origin);
  assert.ok(origins.size >= 15);
});
