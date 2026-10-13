import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createPublicClient, http, isAddress } from "viem";
import { compareAudit } from "@/lib/chain/audit";
import { simKey } from "@/lib/chain/batch";
import { londonLedgerAbi, monadTestnet } from "@/lib/chain/monad";

export const runtime = "nodejs";
export const maxDuration = 15;
export const dynamic = "force-dynamic";

const reader = createPublicClient({ chain: monadTestnet, transport: http() });

interface Snapshot {
  sim_id: string;
  balance_pence: number | string;
  pending_pence: number | string;
  pending_count: number;
}

/** Read-only: compares the caller's game balance with LondonLedger.balancePence for their sim. */
export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ledger = process.env.MONAD_LEDGER_ADDRESS;
  if (!url || !serviceKey || !ledger || !isAddress(ledger)) {
    return NextResponse.json({ error: "Audit desk is closed" }, { status: 503 });
  }
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const user = await admin.auth.getUser(token);
  if (user.error || !user.data.user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  try {
    const snapshot = await admin.rpc("chain_audit", { p_owner: user.data.user.id });
    if (snapshot.error) throw new Error(snapshot.error.message);
    const row = (snapshot.data as Snapshot[] | null)?.[0];
    if (!row) return NextResponse.json({ error: "No Londoner yet" }, { status: 404 });
    const onchain = await reader.readContract({
      address: ledger,
      abi: londonLedgerAbi,
      functionName: "balancePence",
      args: [simKey(row.sim_id)],
    });
    return NextResponse.json(
      compareAudit({
        balancePence: row.balance_pence,
        pendingPence: row.pending_pence,
        pendingCount: row.pending_count,
        onchainPence: onchain,
      }),
    );
  } catch (error) {
    console.error("[chain/audit]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "The auditor is on a break" }, { status: 502 });
  }
}
