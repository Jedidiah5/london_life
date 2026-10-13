import { keccak256, stringToHex, toHex, type Hex } from "viem";

/** A ledger row as returned by the claim_unsettled RPC. */
export interface LedgerRow {
  id: number | string;
  sim_id: string;
  amount_pence: number | string;
  kind: string;
}

export interface SettleBatch {
  sims: Hex[];
  amounts: bigint[];
  kinds: Hex[];
  txIds: bigint[];
}

/** Onchain identity for a Sim: a hash of its row id. No wallets, usernames or anything personal. */
export function simKey(simId: string): Hex {
  return keccak256(toHex(simId));
}

/** Ledger kinds are short words ("wage", "rent"); anything longer than 32 bytes is cut to fit. */
export function kindKey(kind: string): Hex {
  const bytes = new TextEncoder().encode(kind);
  const fitted = bytes.length > 32 ? new TextDecoder().decode(bytes.slice(0, 32)).replace(/\uFFFD+$/, "") : kind;
  return stringToHex(fitted, { size: 32 });
}

function toBigInt(value: number | string, label: string): bigint {
  if (typeof value === "number" && !Number.isSafeInteger(value)) throw new Error(`${label} is not a whole number`);
  if (typeof value === "string" && !/^-?\d+$/.test(value)) throw new Error(`${label} is not a whole number`);
  return BigInt(value);
}

export function buildBatch(rows: readonly LedgerRow[]): SettleBatch {
  const batch: SettleBatch = { sims: [], amounts: [], kinds: [], txIds: [] };
  for (const row of rows) {
    batch.sims.push(simKey(row.sim_id));
    batch.amounts.push(toBigInt(row.amount_pence, "amount_pence"));
    batch.kinds.push(kindKey(row.kind));
    batch.txIds.push(toBigInt(row.id, "id"));
  }
  return batch;
}
