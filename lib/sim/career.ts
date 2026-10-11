import { LEVEL_PAY_STEP, SHIFTS_PER_LEVEL } from "./constants";
import { wageMultiplier } from "./mood";
import type { JobDef } from "./types";

export function levelAfter(job: JobDef, shiftsDone: number): number {
  return Math.min(job.ladder.length - 1, Math.floor(shiftsDone / SHIFTS_PER_LEVEL));
}

export function titleFor(job: JobDef, level: number): string {
  return job.ladder[Math.min(job.ladder.length - 1, Math.max(0, level))] ?? job.name;
}

/** Base wage for salaried jobs; tips and delivery are randomised on the server. */
export function shiftWage(job: JobDef, level: number, moodScore: number): number {
  const base = job.payPerHourPence * job.hours * (1 + LEVEL_PAY_STEP * level);
  return Math.round(base * wageMultiplier(moodScore));
}

export function jobLocked(job: JobDef, skills: Record<string, number>): boolean {
  return Boolean(job.skill) && (skills[job.skill ?? ""] ?? 0) < job.skillRequired;
}
