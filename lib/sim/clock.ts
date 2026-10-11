import { MINUTES_PER_DAY, MINUTES_PER_WEEK, SUNDAY_OFFSET } from "./constants";
import type { Speed } from "./types";

export function advanceClock(gameMinutes: number, realSeconds: number, speed: Speed): number {
  const safeSpeed: Speed = speed === 2 || speed === 3 ? speed : 1;
  return gameMinutes + Math.max(0, realSeconds) * safeSpeed;
}

export function clockParts(gameMinutes: number): {
  day: number;
  hour: number;
  minute: number;
  label: string;
} {
  const safe = Math.max(0, gameMinutes);
  const day = Math.floor(safe / MINUTES_PER_DAY) + 1;
  const mod = safe % MINUTES_PER_DAY;
  const hour = Math.floor(mod / 60);
  const minute = Math.floor(mod % 60);
  const hh = hour.toString().padStart(2, "0");
  const mm = minute.toString().padStart(2, "0");
  return { day, hour, minute, label: `Day ${day} · ${hh}:${mm}` };
}

/** How many Sunday 00:00 boundaries have been reached by this minute. */
export function weekIndex(gameMinutes: number): number {
  if (gameMinutes < SUNDAY_OFFSET) return 0;
  return 1 + Math.floor((gameMinutes - SUNDAY_OFFSET) / MINUTES_PER_WEEK);
}

export function weeksOwed(lastSettledMinute: number, nowMinute: number): number {
  return Math.max(0, weekIndex(nowMinute) - weekIndex(lastSettledMinute));
}

export function isNight(hour: number): boolean {
  return hour >= 20 || hour < 6;
}
