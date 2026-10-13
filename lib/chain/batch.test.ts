import assert from "node:assert/strict";
import test from "node:test";
import { hexToString, keccak256, toHex } from "viem";
import { buildBatch, kindKey, simKey } from "./batch";

const SIM = "6f1c2b9a-3d4e-4f50-8a61-7b8c9d0e1f23";

test("simKey is keccak256 of the sim id and stable", () => {
  assert.equal(simKey(SIM), keccak256(toHex(SIM)));
  assert.equal(simKey(SIM), simKey(SIM));
  assert.notEqual(simKey(SIM), simKey("another-sim"));
});

test("kindKey pads short kinds to bytes32", () => {
  const key = kindKey("wage");
  assert.equal(key.length, 66);
  assert.equal(hexToString(key, { size: 32 }), "wage");
});

test("kindKey cuts kinds longer than 32 bytes", () => {
  const key = kindKey("x".repeat(40));
  assert.equal(key.length, 66);
  assert.equal(hexToString(key, { size: 32 }), "x".repeat(32));
});

test("buildBatch keeps rows in order and arrays the same length", () => {
  const batch = buildBatch([
    { id: 7, sim_id: SIM, amount_pence: 50000, kind: "gift" },
    { id: "8", sim_id: SIM, amount_pence: "-350", kind: "purchase" },
  ]);
  assert.deepEqual(batch.txIds, [BigInt(7), BigInt(8)]);
  assert.deepEqual(batch.amounts, [BigInt(50000), BigInt(-350)]);
  assert.deepEqual(batch.sims, [simKey(SIM), simKey(SIM)]);
  assert.equal(batch.kinds.length, 2);
});

test("buildBatch refuses non-integer amounts and ids", () => {
  assert.throws(() => buildBatch([{ id: 1, sim_id: SIM, amount_pence: 1.5, kind: "wage" }]));
  assert.throws(() => buildBatch([{ id: "1e3", sim_id: SIM, amount_pence: 1, kind: "wage" }]));
});

test("buildBatch of nothing is empty", () => {
  assert.deepEqual(buildBatch([]), { sims: [], amounts: [], kinds: [], txIds: [] });
});
