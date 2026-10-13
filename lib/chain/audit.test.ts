import assert from "node:assert/strict";
import test from "node:test";
import { compareAudit } from "./audit";

test("matches when nothing is pending and the chain equals the game balance", () => {
  const result = compareAudit({ balancePence: 39175, pendingPence: 0, pendingCount: 0, onchainPence: BigInt(39175) });
  assert.equal(result.status, "matches");
  assert.equal(result.gamePence, 39175);
  assert.equal(result.onchainPence, 39175);
});

test("settling while rows are still on their way, even if the numbers differ", () => {
  const result = compareAudit({ balancePence: 39175, pendingPence: -380, pendingCount: 1, onchainPence: BigInt(39555) });
  assert.equal(result.status, "settling");
  assert.equal(result.expectedPence, 39555);
});

test("differs when nothing is pending but the chain disagrees", () => {
  const result = compareAudit({ balancePence: 50000, pendingPence: 0, pendingCount: 0, onchainPence: BigInt(40000) });
  assert.equal(result.status, "differs");
});

test("handles overdrafts and bigint strings from Postgres", () => {
  const result = compareAudit({ balancePence: "-12000", pendingPence: "0", pendingCount: 0, onchainPence: BigInt(-12000) });
  assert.equal(result.status, "matches");
  assert.equal(result.gamePence, -12000);
});
