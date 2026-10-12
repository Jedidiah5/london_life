import { MINUTES_PER_DAY, MISSING_HOME_DAYS } from "./constants";

export function isAwakeHour(hour: number): boolean {
  return hour >= 7 && hour < 23;
}

export function missingHome(lastCallMinute: number, gameMinutes: number): boolean {
  return gameMinutes - lastCallMinute >= MISSING_HOME_DAYS * MINUTES_PER_DAY;
}
