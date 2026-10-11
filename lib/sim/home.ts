import { MINUTES_PER_DAY, MISSING_HOME_DAYS } from "./constants";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** London game time is treated as UTC+0. */
export function timeBackHome(gameMinutes: number, utcOffset: number): { label: string; hour: number; dayDelta: number } {
  const shifted = gameMinutes + utcOffset * 60;
  const londonDay = Math.floor(gameMinutes / MINUTES_PER_DAY);
  const homeDay = Math.floor(shifted / MINUTES_PER_DAY);
  const minuteOfDay = ((shifted % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hour = Math.floor(minuteOfDay / 60);
  const minute = Math.floor(minuteOfDay % 60);
  const day = DAYS[((homeDay % 7) + 7) % 7] ?? "Mon";
  const label = `${day} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return { label, hour, dayDelta: homeDay - londonDay };
}

export function isAwakeHour(hour: number): boolean {
  return hour >= 7 && hour < 23;
}

export function missingHome(lastCallMinute: number, gameMinutes: number): boolean {
  return gameMinutes - lastCallMinute >= MISSING_HOME_DAYS * MINUTES_PER_DAY;
}
