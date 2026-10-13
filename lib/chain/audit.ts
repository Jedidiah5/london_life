export type AuditStatus = "matches" | "settling" | "differs";

export interface AuditInput {
  /** sims.balance_pence */
  balancePence: number | string;
  /** Sum of this sim's ledger rows that have not settled yet. */
  pendingPence: number | string;
  pendingCount: number;
  /** LondonLedger.balancePence(simKey) */
  onchainPence: bigint;
}

export interface AuditResult {
  status: AuditStatus;
  gamePence: number;
  expectedPence: number;
  onchainPence: number;
  pendingCount: number;
}

/** The chain should hold the game balance minus whatever is still on its way there. */
export function compareAudit(input: AuditInput): AuditResult {
  const game = BigInt(input.balancePence);
  const expected = game - BigInt(input.pendingPence);
  const status: AuditStatus =
    input.pendingCount > 0 ? "settling" : input.onchainPence === expected ? "matches" : "differs";
  return {
    status,
    gamePence: Number(game),
    expectedPence: Number(expected),
    onchainPence: Number(input.onchainPence),
    pendingCount: input.pendingCount,
  };
}
