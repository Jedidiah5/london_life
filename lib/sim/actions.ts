import { ACTION_DEFS } from "./constants";
import { bumpNeed } from "./needs";
import type { ActionType, Needs, SimAction } from "./types";

export function makeAction(type: ActionType, effect = 1, id = "action"): SimAction {
  const def = ACTION_DEFS[type];
  return {
    id,
    type,
    totalMinutes: def.minutes,
    remainingMinutes: def.minutes,
    effect,
    label: def.label,
  };
}

export function tickAction(
  action: SimAction,
  needs: Needs,
  elapsedGameMinutes: number,
): { action: SimAction | null; needs: Needs } {
  const def = ACTION_DEFS[action.type];
  const step = Math.min(action.remainingMinutes, Math.max(0, elapsedGameMinutes));
  const nextNeeds = bumpNeed(needs, def.need, def.perMinute * action.effect * step);
  const remaining = action.remainingMinutes - step;
  if (remaining <= 0.001) return { action: null, needs: nextNeeds };
  return { action: { ...action, remainingMinutes: remaining }, needs: nextNeeds };
}
