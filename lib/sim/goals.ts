import type { GoalDef } from "./types";

export function nextGoal(goals: GoalDef[], done: string[]): GoalDef | null {
  return goals.find((goal) => !done.includes(goal.id)) ?? null;
}

export function goalReady(goal: GoalDef, stats: Record<string, number>): boolean {
  return (stats[goal.stat] ?? 0) >= goal.count;
}
