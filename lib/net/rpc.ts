import { actionsById, nationalitiesById } from "@/lib/content";
import { heritageLabel } from "@/lib/sim/actions";
import { formatPence } from "@/lib/sim/money";
import type { InventoryItem, TravelMode } from "@/lib/sim/types";
import type { CreateInput } from "@/lib/store/useGame";
import { useGame } from "@/lib/store/useGame";
import {
  careerOf,
  finishesOf,
  inventoryRow,
  num,
  ownedFinishesOf,
  parseCheckpoint,
  parseState,
  record,
  shiftOf,
  skillsOf,
  statsOf,
  str,
} from "./parse";
import { getSandbox } from "./sandbox";
import { ensureSession, getSupabase, supabaseConfigured } from "./supabase";

type Row = Record<string, unknown>;

async function call(
  fn: string,
  args: Row = {},
): Promise<{ data: Row | null; error: string | null }> {
  if (!supabaseConfigured()) {
    const result = getSandbox().rpc(fn, args);
    return { data: record(result.data), error: result.error };
  }
  const supabase = getSupabase();
  if (!supabase) return { data: null, error: "Supabase is not configured" };
  const result = await supabase.rpc(fn, args);
  if (result.error) return { data: null, error: result.error.message };
  return { data: record(result.data), error: null };
}

function applyCommon(row: Row) {
  const game = useGame.getState();
  if (typeof row.balance_pence === "number") {
    game.applyMoney(
      row.balance_pence,
      typeof row.oyster_pence === "number" ? row.oyster_pence : undefined,
    );
  }
  if (row.stats) game.setStats(statsOf(row.stats));
  if (row.skills) game.setSkills(skillsOf(row.skills));
  if ("career" in row) game.setCareer(careerOf(row.career));
}

export async function createCharacter(
  input: CreateInput,
): Promise<string | null> {
  await ensureSession();
  const created = await call("create_sim", {
    p_username: input.username,
    p_name: input.name,
    p_appearance: input.appearance,
    p_traits: input.traits,
    p_aspiration: input.aspiration,
  });
  if (created.error) return created.error;
  const snapshot = parseState(created.data);
  if (!snapshot) return refreshState();
  useGame.getState().hydrate(snapshot);
  return null;
}

export async function refreshState(): Promise<string | null> {
  await ensureSession();
  const result = await call("get_state");
  if (result.error) return result.error;
  const snapshot = parseState(result.data);
  if (!snapshot) {
    if (useGame.getState().created) useGame.getState().reset();
    return null;
  }
  useGame.getState().hydrate(snapshot);
  return null;
}

export async function checkpointNeeds(): Promise<void> {
  const state = useGame.getState();
  if (!state.created || !state.simId || state.readOnly) return;
  const result = await call("checkpoint_needs", {
    p_needs: state.needs,
    p_game_time: Math.round(state.gameMinutes),
    p_heating: state.heatingOn,
  });
  if (result.error || !result.data) return;
  const patch = parseCheckpoint(result.data);
  if (patch) useGame.getState().applyCheckpoint(patch);
}

/** Server charges and checks first; only then does the Sim walk over and do it. */
export async function performAction(
  actionId: string,
  target: string | null,
): Promise<string | null> {
  const def = actionsById[actionId];
  if (!def) return "Not on the menu";
  const blocked = useGame.getState().canQueue();
  if (blocked) return blocked;
  const result = await call("perform_action", {
    p_action: actionId,
    p_target: target,
  });
  if (result.error || !result.data) return result.error ?? "Could not do that";
  applyCommon(result.data);
  if (def.costPence > 0) {
    useGame
      .getState()
      .applyMoney(
        num(result.data.balance_pence, useGame.getState().balancePence),
        undefined,
        {
          id: `act-${Date.now()}`,
          amountPence: -def.costPence,
          kind: "purchase",
          ref: def.id,
          createdAt: new Date().toISOString(),
        },
      );
  }
  if (actionId === "call_home")
    useGame.getState().setLastCall(num(result.data.last_call_minute));
  const shown = heritageLabel(
    def,
    nationalitiesById[useGame.getState().appearance.origin],
  );
  return useGame.getState().queueAction({ ...def, ...shown }, target);
}

export async function claimGoal(goalId: string): Promise<number | string> {
  const result = await call("claim_goal", { p_goal: goalId });
  if (result.error || !result.data) return result.error ?? "Not yet";
  applyCommon(result.data);
  const done = result.data.goals_done;
  if (Array.isArray(done))
    useGame
      .getState()
      .setGoalsDone(done.filter((goal) => typeof goal === "string"));
  return num(result.data.reward_pence);
}

export async function applyJob(jobId: string): Promise<string | null> {
  const result = await call("apply_job", { p_job: jobId });
  if (result.error || !result.data) return result.error ?? "Could not apply";
  applyCommon(result.data);
  return null;
}

export async function greet(target: string): Promise<string | null> {
  const result = await call("greet", { p_target: target });
  if (result.error || !result.data)
    return result.error ?? "They didn't hear you";
  applyCommon(result.data);
  return null;
}

export async function buyItem(
  itemId: string,
  colour: string,
): Promise<InventoryItem | string> {
  const result = await call("buy_item", { p_item: itemId, p_colour: colour });
  if (result.error || !result.data) return result.error ?? "Could not buy that";
  applyCommon(result.data);
  const item = inventoryRow(result.data.item);
  if (!item) return "Could not buy that";
  useGame.getState().upsertInventory(item);
  return item;
}

export async function placeItem(item: InventoryItem): Promise<string | null> {
  const result = await call("place_item", {
    p_inventory: item.id,
    p_x: item.x,
    p_y: item.y,
    p_rotation: item.rotation,
  });
  if (result.error) return result.error;
  if (result.data) applyCommon(result.data);
  useGame.getState().upsertInventory({ ...item, placed: true });
  return null;
}

export async function buyFinish(finishId: string): Promise<string | null> {
  const result = await call("buy_finish", { p_finish: finishId });
  if (result.error || !result.data) return result.error ?? "Could not do that";
  applyCommon(result.data);
  useGame
    .getState()
    .setFinishes(
      finishesOf(result.data.finishes),
      ownedFinishesOf(result.data.owned_finishes),
    );
  return null;
}

export async function sellItem(inventoryId: string): Promise<string | null> {
  const result = await call("sell_item", { p_inventory: inventoryId });
  if (result.error || !result.data) return result.error ?? "Could not sell";
  applyCommon(result.data);
  useGame.getState().removeInventory(inventoryId);
  return null;
}

export async function setHeating(on: boolean): Promise<string | null> {
  const result = await call("set_heating", { p_on: on });
  if (result.error) return result.error;
  useGame.getState().setHeatingLocal(on);
  return null;
}

export async function topUpOyster(pence: number): Promise<string | null> {
  const result = await call("top_up_oyster", { p_pence: pence });
  if (result.error || !result.data) return result.error ?? "Could not top up";
  applyCommon(result.data);
  return null;
}

export async function startShift(jobId: string): Promise<string | null> {
  const result = await call("start_shift", { p_job: jobId });
  if (result.error || !result.data) return result.error ?? "Could not start";
  const shift = shiftOf(result.data.shift);
  if (!shift) return "Could not start";
  useGame.getState().setShift(shift);
  return null;
}

export interface ShiftResult {
  wage: string;
  promoted: boolean;
  title: string;
}

export async function finishShift(): Promise<ShiftResult | string> {
  const result = await call("finish_shift");
  if (result.error || !result.data)
    return result.error ?? "Wages are not ready";
  const row = result.data;
  const wage = num(row.wage_pence);
  applyCommon(row);
  useGame.getState().applyMoney(num(row.balance_pence), undefined, {
    id: `wage-${Date.now()}`,
    amountPence: wage,
    kind: "wage",
    ref: str(row.job_id) || null,
    createdAt: new Date().toISOString(),
  });
  const energy = record(row.needs)?.energy;
  if (typeof energy === "number")
    useGame.getState().setNeeds({ ...useGame.getState().needs, energy });
  useGame.getState().setShift(null);
  return {
    wage: formatPence(wage),
    promoted: row.promoted === true,
    title: str(row.title),
  };
}

export async function travelTo(
  destination: string,
  mode: TravelMode,
): Promise<string | null> {
  const result = await call("travel", {
    p_destination: destination,
    p_mode: mode,
  });
  if (result.error || !result.data) return result.error ?? "Could not travel";
  applyCommon(result.data);
  useGame.getState().setLocation(destination);
  const energy = result.data.needs_energy;
  if (typeof energy === "number")
    useGame.getState().setNeeds({ ...useGame.getState().needs, energy });
  return null;
}

export async function sendGift(
  simId: string,
  pence: number,
): Promise<string | null> {
  const result = await call("send_gift", { p_to: simId, p_pence: pence });
  if (result.error || !result.data) return result.error ?? "Gift failed";
  applyCommon(result.data);
  return null;
}

export async function addFriend(username: string): Promise<string | null> {
  const result = await call("add_friend", { p_username: username });
  if (result.error) return result.error;
  return refreshState();
}

export async function loadHome(simId: string): Promise<string | null> {
  const result = await call("get_home", { p_sim: simId });
  if (result.error || !result.data) return result.error ?? "Can't visit";
  const row = result.data;
  const items = Array.isArray(row.items) ? row.items : [];
  const { useUi } = await import("@/lib/store/useUi");
  const { normaliseAppearance } = await import("@/lib/sim/appearance");
  useUi.getState().setVisit({
    simId,
    name: str(row.name, "Londoner"),
    homeId: str(row.home_id, "boxroom_z4"),
    appearance: normaliseAppearance(row.appearance),
    items: items.flatMap((entry) => {
      const item = inventoryRow(entry);
      return item ? [{ ...item, placed: true }] : [];
    }),
  });
  useGame.getState().setReadOnly(true);
  return null;
}

export function resetSandbox(): void {
  getSandbox().reset();
  useGame.getState().reset();
}
