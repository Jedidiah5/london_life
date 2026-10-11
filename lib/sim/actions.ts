import { OVERDRAFT_LIMIT_PENCE } from "./constants";
import { canAfford } from "./money";
import { clampNeed } from "./needs";
import { NEED_KEYS, type ActionDef, type Needs, type SimAction } from "./types";

export function makeAction(def: ActionDef, quality = 1, id = "action", target: string | null = null): SimAction {
  const minutes = Math.max(1, def.minutes);
  const rates: Partial<Needs> = {};
  for (const key of NEED_KEYS) {
    const total = def.effects[key];
    if (typeof total !== "number") continue;
    const scaled = def.scales && total > 0 ? total * quality : total;
    rates[key] = scaled / minutes;
  }
  return {
    id,
    actionId: def.id,
    label: def.label,
    emoji: def.emoji,
    anim: def.anim,
    totalMinutes: minutes,
    remainingMinutes: minutes,
    rates,
    target,
  };
}

export function tickAction(
  action: SimAction,
  needs: Needs,
  elapsedGameMinutes: number,
): { action: SimAction | null; needs: Needs } {
  const step = Math.min(action.remainingMinutes, Math.max(0, elapsedGameMinutes));
  const next = { ...needs };
  for (const key of NEED_KEYS) {
    const rate = action.rates[key];
    if (typeof rate === "number") next[key] = clampNeed(next[key] + rate * step);
  }
  const remaining = action.remainingMinutes - step;
  if (remaining <= 0.001) return { action: null, needs: next };
  return { action: { ...action, remainingMinutes: remaining }, needs: next };
}

export interface ActionContext {
  balancePence: number;
  skills: Record<string, number>;
  location: string;
}

/** Same checks as perform_action on the server, so the sheet can grey things out. */
export function actionBlocker(def: ActionDef, ctx: ActionContext): string | null {
  if (def.requires && (ctx.skills[def.requires.skill] ?? 0) < def.requires.level) {
    return `Need ${capitalise(def.requires.skill)} ${def.requires.level}`;
  }
  if (def.venue && def.venue !== ctx.location) return "Not here";
  if (!def.venue && !def.anywhere && ctx.location !== "home") return "Only at home";
  if (!canAfford(ctx.balancePence, def.costPence, OVERDRAFT_LIMIT_PENCE)) return "Not enough money";
  return null;
}

export function effectChips(def: ActionDef): { key: string; amount: number }[] {
  return NEED_KEYS.flatMap((key) => {
    const amount = def.effects[key];
    return typeof amount === "number" && amount !== 0 ? [{ key, amount }] : [];
  });
}

export function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
