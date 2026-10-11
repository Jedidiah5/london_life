import type { CreateInput } from "@/lib/store/useGame";
import { useGame } from "@/lib/store/useGame";
import { formatPence } from "@/lib/sim/money";
import type { InventoryItem, TravelMode } from "@/lib/sim/types";
import { parseCheckpoint, parseState } from "./parse";
import { ensureSession, getSupabase, supabaseConfigured } from "./supabase";

function messageOf(error: { message: string } | null): string {
  return error?.message ?? "Something went wrong";
}

async function call<T>(fn: string, args: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { data: null, error: "Supabase is not configured" };
  const result = await supabase.rpc(fn, args);
  if (result.error) return { data: null, error: messageOf(result.error) };
  return { data: result.data as T, error: null };
}

export async function createCharacter(input: CreateInput): Promise<string | null> {
  if (!supabaseConfigured()) {
    useGame.getState().createLocal(input);
    return null;
  }
  const sessionError = await ensureSession();
  if (sessionError) return sessionError;
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
  if (!supabaseConfigured()) return null;
  const sessionError = await ensureSession();
  if (sessionError) return sessionError;
  const result = await call<unknown>("get_state", {});
  if (result.error) return result.error;
  const snapshot = parseState(result.data);
  if (!snapshot) return null;
  useGame.getState().hydrate(snapshot);
  return null;
}

export async function checkpointNeeds(): Promise<void> {
  const state = useGame.getState();
  if (!state.cloud || !state.simId) return;
  const result = await call<unknown>("checkpoint_needs", {
    p_needs: state.needs,
    p_game_time: Math.round(state.gameMinutes),
    p_heating: state.heatingOn,
  });
  if (result.error || !result.data) return;
  const patch = parseCheckpoint(result.data);
  if (patch) useGame.getState().applyCheckpoint(patch);
}

export async function buyItem(itemId: string, colour: string): Promise<InventoryItem | string> {
  const result = await call<unknown>("buy_item", { p_item: itemId, p_colour: colour });
  if (result.error || !result.data) return result.error ?? "Could not buy that";
  const row = result.data;
  if (!row || typeof row !== "object") return "Could not buy that";
  const record = row as Record<string, unknown>;
  const balance = record.balance_pence;
  if (typeof balance === "number") useGame.getState().applyMoney(balance);
  const item = record.item;
  if (!item || typeof item !== "object") return "Could not buy that";
  const owned = item as Record<string, unknown>;
  const inventoryItem: InventoryItem = {
    id: String(owned.id),
    itemId: String(owned.item_id),
    placed: owned.placed === true,
    x: Number(owned.x ?? 0),
    y: Number(owned.y ?? 0),
    rotation: Number(owned.rotation ?? 0),
    colour: String(owned.colour ?? colour),
  };
  useGame.getState().upsertInventory(inventoryItem);
  return inventoryItem;
}

export async function placeItem(item: InventoryItem): Promise<string | null> {
  const result = await call<unknown>("place_item", {
    p_inventory: item.id,
    p_x: item.x,
    p_y: item.y,
    p_rotation: item.rotation,
  });
  if (result.error) return result.error;
  useGame.getState().upsertInventory({ ...item, placed: true });
  return null;
}

export async function sellItem(inventoryId: string): Promise<string | null> {
  const result = await call<unknown>("sell_item", { p_inventory: inventoryId });
  if (result.error || !result.data || typeof result.data !== "object") return result.error ?? "Could not sell";
  const balance = (result.data as Record<string, unknown>).balance_pence;
  if (typeof balance === "number") {
    useGame.getState().applyMoney(balance, undefined, {
      id: `sale-${inventoryId}`,
      amountPence: 0,
      kind: "sale",
      ref: inventoryId,
      createdAt: new Date().toISOString(),
    });
  }
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
  const result = await call<unknown>("top_up_oyster", { p_pence: pence });
  if (result.error || !result.data || typeof result.data !== "object") return result.error ?? "Could not top up";
  const row = result.data as Record<string, unknown>;
  if (typeof row.balance_pence === "number" && typeof row.oyster_pence === "number") {
    useGame.getState().applyMoney(row.balance_pence, row.oyster_pence);
  }
  return null;
}

export async function purchaseVenue(kind: string): Promise<string | null> {
  const result = await call<unknown>("venue_purchase", { p_kind: kind });
  if (result.error || !result.data || typeof result.data !== "object") return result.error ?? "Not enough money";
  const balance = (result.data as Record<string, unknown>).balance_pence;
  if (typeof balance === "number") useGame.getState().applyMoney(balance);
  return null;
}

export async function startShift(jobId: string): Promise<string | null> {
  const result = await call<unknown>("start_shift", { p_job: jobId });
  if (result.error || !result.data || typeof result.data !== "object") return result.error ?? "Could not start";
  const row = result.data as Record<string, unknown>;
  const shift = row.shift;
  if (!shift || typeof shift !== "object") return "Could not start";
  const body = shift as Record<string, unknown>;
  useGame.getState().setShift({
    jobId: String(body.jobId),
    startedAt: String(body.startedAt),
    expectedSeconds: Number(body.expectedSeconds),
    moodScore: Number(body.moodScore),
  });
  return null;
}

export async function finishShift(): Promise<string | null> {
  const result = await call<unknown>("finish_shift", {});
  if (result.error || !result.data || typeof result.data !== "object") return result.error ?? "Wages are not ready";
  const row = result.data as Record<string, unknown>;
  if (typeof row.balance_pence === "number") {
    const wage = typeof row.wage_pence === "number" ? row.wage_pence : 0;
    useGame.getState().applyMoney(row.balance_pence, undefined, {
      id: `wage-${Date.now()}`,
      amountPence: wage,
      kind: "wage",
      ref: typeof row.job_id === "string" ? row.job_id : null,
      createdAt: new Date().toISOString(),
    });
  }
  if (row.skills && typeof row.skills === "object") {
    useGame.getState().setSkills(row.skills as Record<string, number>);
  }
  if (row.needs && typeof row.needs === "object") {
    const needs = useGame.getState().needs;
    const energy = (row.needs as Record<string, unknown>).energy;
    if (typeof energy === "number") useGame.getState().setNeeds({ ...needs, energy });
  }
  useGame.getState().setShift(null);
  return typeof row.wage_pence === "number" ? formatPence(row.wage_pence) : null;
}

export async function travelTo(destination: string, mode: TravelMode): Promise<string | null> {
  const result = await call<unknown>("travel", { p_destination: destination, p_mode: mode });
  if (result.error || !result.data || typeof result.data !== "object") return result.error ?? "Could not travel";
  const row = result.data as Record<string, unknown>;
  if (typeof row.balance_pence === "number") {
    useGame.getState().applyMoney(
      row.balance_pence,
      typeof row.oyster_pence === "number" ? row.oyster_pence : undefined,
    );
  }
  const energy = typeof row.energy === "number" ? row.energy : 0;
  useGame.getState().setLocation(destination === "home" ? "home" : destination, 0);
  if (energy) useGame.getState().setNeeds({ ...useGame.getState().needs, energy: useGame.getState().needs.energy });
  if (typeof row.needs_energy === "number") {
    useGame.getState().setNeeds({ ...useGame.getState().needs, energy: row.needs_energy });
  }
  return null;
}

export async function sendGift(simId: string, pence: number): Promise<string | null> {
  const result = await call<unknown>("send_gift", { p_to: simId, p_pence: pence });
  if (result.error || !result.data || typeof result.data !== "object") return result.error ?? "Gift failed";
  const balance = (result.data as Record<string, unknown>).balance_pence;
  if (typeof balance === "number") useGame.getState().applyMoney(balance);
  return null;
}

export async function addFriend(username: string): Promise<string | null> {
  const result = await call("add_friend", { p_username: username });
  if (result.error) return result.error;
  return refreshState();
}

export async function loadHome(simId: string): Promise<string | null> {
  const result = await call<unknown>("get_home", { p_sim: simId });
  if (result.error || !result.data || typeof result.data !== "object") return result.error ?? "Can't visit";
  const row = result.data as Record<string, unknown>;
  const items = Array.isArray(row.items) ? row.items : [];
  const { useUi } = await import("@/lib/store/useUi");
  const look = row.appearance;
  useUi.getState().setVisit({
    simId,
    name: typeof row.name === "string" ? row.name : "Londoner",
    homeId: typeof row.home_id === "string" ? row.home_id : "boxroom_z4",
    appearance:
      look && typeof look === "object"
        ? {
            body: (look as { body?: string }).body === "b" ? "b" : "a",
            skin: String((look as { skin?: string }).skin ?? "#e0ac7a"),
            hair: "short",
            hairColor: String((look as { hairColor?: string }).hairColor ?? "#1c1c1c"),
            top: String((look as { top?: string }).top ?? "#1f4b99"),
            bottom: String((look as { bottom?: string }).bottom ?? "#243044"),
            shoes: String((look as { shoes?: string }).shoes ?? "#1a1a1a"),
            style: "casual",
          }
        : useGame.getState().appearance,
    items: items.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const owned = entry as Record<string, unknown>;
      if (typeof owned.id !== "string" || typeof owned.item_id !== "string") return [];
      return [
        {
          id: owned.id,
          itemId: owned.item_id,
          placed: true,
          x: Number(owned.x ?? 0),
          y: Number(owned.y ?? 0),
          rotation: Number(owned.rotation ?? 0),
          colour: typeof owned.colour === "string" ? owned.colour : "#f4f1ea",
        },
      ];
    }),
  });
  useGame.getState().setReadOnly(true);
  return null;
}
