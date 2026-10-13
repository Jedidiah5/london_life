import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, isAddress, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { buildBatch, type LedgerRow } from "@/lib/chain/batch";
import { londonLedgerAbi, monadTestnet } from "@/lib/chain/monad";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

const BATCH_LIMIT = 50;
const THROTTLE_MS = 2000;

let lastCall = 0;
let running = false;

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const operatorKey = process.env.MONAD_OPERATOR_KEY;
  const ledger = process.env.MONAD_LEDGER_ADDRESS;
  if (!url || !serviceKey || !operatorKey || !ledger || !isAddress(ledger)) return null;
  const key = (operatorKey.startsWith("0x") ? operatorKey : `0x${operatorKey}`) as Hex;
  return { url, serviceKey, operatorKey: key, ledger };
}

export async function POST() {
  const env = config();
  if (!env) return NextResponse.json({ error: "Chain settlement is not configured" }, { status: 503 });

  const now = Date.now();
  if (running || now - lastCall < THROTTLE_MS) {
    return NextResponse.json({ settled: 0, throttled: true }, { status: 429 });
  }
  lastCall = now;
  running = true;

  const admin = createClient(env.url, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let ids: Array<number | string> = [];

  try {
    const claimed = await admin.rpc("claim_unsettled", { p_limit: BATCH_LIMIT });
    if (claimed.error) throw new Error(claimed.error.message);
    const rows = (claimed.data ?? []) as LedgerRow[];
    if (rows.length === 0) return NextResponse.json({ settled: 0 });
    ids = rows.map((row) => row.id);

    const batch = buildBatch(rows);
    const account = privateKeyToAccount(env.operatorKey);
    const transport = http();
    const wallet = createWalletClient({ account, chain: monadTestnet, transport });
    const reader = createPublicClient({ chain: monadTestnet, transport });

    const tx = await wallet.writeContract({
      address: env.ledger,
      abi: londonLedgerAbi,
      functionName: "settleBatch",
      args: [batch.sims, batch.amounts, batch.kinds, batch.txIds],
    });
    const receipt = await reader.waitForTransactionReceipt({ hash: tx, timeout: 20_000 });
    if (receipt.status !== "success") throw new Error(`settleBatch reverted in ${tx}`);

    const marked = await admin.rpc("mark_settled", { p_ids: ids, p_tx: tx });
    if (marked.error) throw new Error(marked.error.message);
    return NextResponse.json({ settled: rows.length, tx });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Settlement failed";
    console.error("[chain/flush]", message);
    if (ids.length > 0) {
      const reset = await admin.rpc("mark_pending", { p_ids: ids });
      if (reset.error) console.error("[chain/flush] mark_pending", reset.error.message);
    }
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    running = false;
  }
}
