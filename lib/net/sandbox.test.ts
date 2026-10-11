import assert from "node:assert/strict";
import test from "node:test";
import { createSandbox } from "./sandbox";

function fresh() {
  let saved: string | null = null;
  let clock = 1_000_000;
  const sandbox = createSandbox(
    { read: () => saved, write: (value) => (saved = value) },
    () => clock,
  );
  const ok = (fn: string, args: Record<string, unknown> = {}) => {
    const result = sandbox.rpc(fn, args);
    assert.equal(result.error, null, `${fn}: ${result.error}`);
    return result.data as Record<string, unknown>;
  };
  const err = (fn: string, args: Record<string, unknown> = {}) => sandbox.rpc(fn, args).error;
  const advance = (seconds: number) => {
    clock += seconds * 1000;
  };
  ok("create_sim", {
    p_username: "alex_ldn",
    p_name: "Alex",
    p_appearance: { origin: "nigeria" },
    p_traits: ["Foodie", "Chatty"],
    p_aspiration: "tech_founder",
  });
  return { ok, err, advance };
}

test("a new Londoner starts with £400, a mattress and a chair", () => {
  const { ok } = fresh();
  const state = ok("get_state");
  const sim = state.sim as Record<string, unknown>;
  assert.equal(sim.balance_pence, 40_000);
  assert.equal((state.inventory as unknown[]).length, 2);
});

test("eating at home charges pence, counts for the goal, and pays the reward once", () => {
  const { ok, err } = fresh();
  assert.equal(err("claim_goal", { p_goal: "eat" }), "Not done yet");
  const ate = ok("perform_action", { p_action: "beans_on_toast" });
  assert.equal(ate.balance_pence, 40_000 - 60);
  const claimed = ok("claim_goal", { p_goal: "eat" });
  assert.equal(claimed.balance_pence, 40_000 - 60 + 500);
  assert.equal(err("claim_goal", { p_goal: "eat" }), "Do the goals in order");
});

test("venue actions only work at the venue; home actions only at home", () => {
  const { ok, err } = fresh();
  assert.equal(err("perform_action", { p_action: "pint" }), "Go there first");
  ok("travel", { p_destination: "pub", p_mode: "bus" });
  assert.equal(err("perform_action", { p_action: "beans_on_toast" }), "Only at home");
  const drank = ok("perform_action", { p_action: "pint" });
  assert.equal(drank.balance_pence, 40_000 - 175 - 650);
  assert.equal(err("perform_action", { p_action: "free_money" }), "Not on the menu");
});

test("jobs need applying, the right place, and a finished shift", () => {
  const { ok, err, advance } = fresh();
  assert.equal(err("apply_job", { p_job: "lawyer" }), "Skill too low");
  ok("apply_job", { p_job: "barista" });
  assert.equal(err("start_shift", { p_job: "cleaner" }), "Apply for this job first");
  assert.equal(err("start_shift", { p_job: "barista" }), "Go there first");
  ok("travel", { p_destination: "shoreditch_coffee", p_mode: "tube" });
  ok("start_shift", { p_job: "barista" });
  assert.equal(err("finish_shift"), "Shift is not finished");
  advance(240);
  const paid = ok("finish_shift");
  assert.ok((paid.wage_pence as number) > 0);
  assert.deepEqual(paid.career, { job_id: "barista", level: 0, shifts_done: 1 });
});

test("the queue and the overdraft stop spam", () => {
  const { ok, err } = fresh();
  let accepted = 0;
  while (accepted < 50 && !err("perform_action", { p_action: "side_project" })) accepted += 1;
  assert.ok(accepted > 3 && accepted < 25, `accepted ${accepted}`);
  assert.equal(err("perform_action", { p_action: "side_project" }), "Queue is full");
  ok("buy_item", { p_item: "sofa_long", p_colour: "" });
  assert.equal(err("buy_item", { p_item: "sofa_long", p_colour: "" }), "Overdraft is maxed out");
});

test("checkpoints only accept need gains the server has seen paid for", () => {
  const { ok, advance } = fresh();
  advance(5);
  const cheat = ok("checkpoint_needs", {
    p_needs: { hunger: 100, energy: 100, hygiene: 100, bladder: 100, fun: 100, social: 100 },
    p_game_time: 485,
    p_heating: true,
  });
  assert.ok(((cheat.needs as Record<string, number>).hygiene ?? 0) < 90);
  assert.ok(((cheat.needs as Record<string, number>).social ?? 0) < 70);
  ok("perform_action", { p_action: "long_shower" });
  advance(5);
  const honest = ok("checkpoint_needs", {
    p_needs: { hunger: 60, energy: 80, hygiene: 100, bladder: 80, fun: 70, social: 60 },
    p_game_time: 500,
    p_heating: true,
  });
  assert.equal((honest.needs as Record<string, number>).hygiene, 100);
});

test("placing an item cannot sit on the shared fridge", () => {
  const { ok, err } = fresh();
  const bought = ok("buy_item", { p_item: "bookcase", p_colour: "" });
  const item = bought.item as Record<string, unknown>;
  assert.equal(err("place_item", { p_inventory: item.id, p_x: 0, p_y: 4, p_rotation: 0 }), "The shared fridge is already there");
  const placed = ok("place_item", { p_inventory: item.id, p_x: 2, p_y: 2, p_rotation: 0 });
  assert.equal((placed.stats as Record<string, number>).place, 1);
});

test("greeting needs the local to actually be there", () => {
  const { ok, err } = fresh();
  assert.equal(err("greet", { p_target: "tunde" }), "They're not here");
  ok("travel", { p_destination: "brixton", p_mode: "bus" });
  const greeted = ok("greet", { p_target: "tunde" });
  assert.equal((greeted.stats as Record<string, number>).hello, 1);
});
