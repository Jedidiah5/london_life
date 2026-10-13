"use client";

import { useEffect, useState } from "react";
import { LedgerRow } from "@/components/phone/apps/LedgerRow";
import { scheduleFlush } from "@/lib/chain/flush";
import { EXPLORER_TX } from "@/lib/chain/monad";
import { ledgerLabel, roomLayout } from "@/lib/content";
import { type Audit, type Departure, loadAudit, loadDepartures, refreshLedger } from "@/lib/net/rpc";
import { formatPence } from "@/lib/sim/money";
import type { SpotPanel as PanelKind } from "@/lib/sim/types";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";

const POLL_MS = 3000;

const BLURBS: Record<PanelKind, string> = {
  departures: "Every payment in London, the moment it lands.",
  receipts: "Your last ten, printed fresh.",
  audit: "Does the city's book agree with yours?",
};

function signed(pence: number): string {
  return `${pence < 0 ? "−" : "+"}${formatPence(Math.abs(pence))}`;
}

/** Re-runs `load` every few seconds while the panel is open. */
function usePoll(load: () => Promise<void> | void) {
  useEffect(() => {
    scheduleFlush();
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function DeparturesBoard() {
  const [rows, setRows] = useState<Departure[] | null>(null);
  usePoll(async () => setRows(await loadDepartures()));
  return (
    <div className="rounded-2xl bg-[#121019] p-2 font-mono text-[11px] text-[#ffb000] shadow-inner">
      <div className="mb-1 flex items-center justify-between border-b border-[#836ef9]/40 pb-1 text-[10px] tracking-[0.2em] text-[#c9bdff]">
        <span>DEPARTURES</span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3ccf6e]" /> LIVE
        </span>
      </div>
      {rows === null ? <p className="py-3 text-center opacity-70">Loading the board…</p> : null}
      {rows?.length === 0 ? <p className="py-3 text-center opacity-70">Nothing has landed yet.</p> : null}
      <ul className="max-h-[42vh] space-y-0.5 overflow-y-auto">
        {rows?.map((row) => (
          <li key={row.id}>
            <a
              href={`${EXPLORER_TX}${row.chainTx}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded px-1 py-1 hover:bg-white/5 active:bg-white/10"
            >
              <span className="min-w-0 flex-1 truncate">
                {row.firstName} · {ledgerLabel(row.kind, row.ref)}
              </span>
              <span className={row.amountPence >= 0 ? "text-[#7ee2a0]" : ""}>{signed(row.amountPence)}</span>
              <span className="text-[#c9bdff]">· settled</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReceiptPrinter() {
  const ledger = useGame((state) => state.ledger);
  usePoll(refreshLedger);
  const settled = ledger.filter((entry) => entry.chainStatus === "settled").slice(0, 10);
  const waiting = ledger.some((entry) => entry.chainStatus && entry.chainStatus !== "settled");
  return (
    <div className="space-y-1 text-xs">
      {waiting ? <p className="px-1 text-[10px] text-[#5c6b7a]">⏳ A fresh one is printing…</p> : null}
      {settled.length === 0 ? (
        <p className="rounded-xl bg-[#f8f6f1] px-3 py-3 text-center text-[#5c6b7a]">
          No receipts yet. Spend something and come back in a second.
        </p>
      ) : (
        <ul className="max-h-[42vh] space-y-1 overflow-y-auto">
          {settled.map((entry) => (
            <LedgerRow key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  );
}

function AuditDesk() {
  const [audit, setAudit] = useState<Audit | null>(null);
  usePoll(async () => {
    const next = await loadAudit();
    if (next.status === "settling") scheduleFlush();
    setAudit(next);
  });
  if (!audit) return <p className="py-3 text-center text-xs text-[#5c6b7a]">Opening the books…</p>;
  if ("message" in audit) {
    return <p className="rounded-xl bg-[#f8f6f1] px-3 py-3 text-center text-xs text-[#5c6b7a]">{audit.message}</p>;
  }
  const verdict =
    audit.status === "matches"
      ? { text: "✓ matches", tone: "bg-[#e6f6ec] text-[#22924f]" }
      : audit.status === "settling"
        ? { text: "settling…", tone: "bg-[#f1f3f5] text-[#5c6b7a]" }
        : { text: `✗ off by ${formatPence(Math.abs(audit.gamePence - audit.onchainPence))}`, tone: "bg-[#ffe4e4] text-[#a3162b]" };
  return (
    <div className="rounded-2xl bg-[#f8f6f1] p-3 text-[#1b2838]">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span>
          <span className="block text-[10px] font-bold tracking-wide text-[#9aa5b1]">GAME LEDGER</span>
          <span className="font-extrabold">{formatPence(audit.gamePence)}</span>
        </span>
        <span className="text-[#9aa5b1]">·</span>
        <span className="text-right">
          <span className="block text-[10px] font-bold tracking-wide text-[#9aa5b1]">ON MONAD</span>
          <span className="font-extrabold">{formatPence(audit.onchainPence)}</span>
        </span>
      </div>
      <div className={`mt-2 rounded-full px-3 py-1 text-center text-xs font-bold ${verdict.tone}`}>{verdict.text}</div>
      {audit.status === "settling" ? (
        <p className="mt-1 text-center text-[10px] text-[#5c6b7a]">
          {audit.pendingCount} payment{audit.pendingCount === 1 ? "" : "s"} still on the way
        </p>
      ) : null}
    </div>
  );
}

export function SpotPanel() {
  const target = useUi((state) => state.sheet);
  const location = useGame((state) => state.location);
  const homeId = useGame((state) => state.homeId);
  if (!target) return null;
  const fixture = roomLayout(location, homeId, null).fixtures.find((entry) => entry.id === target);
  const panel = fixture?.panel;
  if (!fixture || !panel) return null;

  return (
    <section className="pointer-events-auto mx-auto w-full max-w-md rounded-3xl bg-white p-3 text-[#1b2838] shadow-2xl">
      <div className="mb-2 flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#efeaff] text-2xl">{fixture.emoji}</div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold leading-tight">{fixture.label}</h2>
          <p className="text-[12px] text-[#5c6b7a]">{BLURBS[panel]}</p>
        </div>
        <button
          type="button"
          aria-label="Close"
          className="grid h-8 w-8 place-items-center rounded-full bg-[#f1ede6] text-sm"
          onClick={() => useUi.getState().openSheet(null)}
        >
          ✕
        </button>
      </div>
      {panel === "departures" ? <DeparturesBoard /> : panel === "receipts" ? <ReceiptPrinter /> : <AuditDesk />}
    </section>
  );
}
