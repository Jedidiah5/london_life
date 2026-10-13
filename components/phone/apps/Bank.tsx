"use client";

import { useEffect } from "react";
import { scheduleFlush } from "@/lib/chain/flush";
import { catalogueById, homesById } from "@/lib/content";
import { refreshLedger, setHeating, topUpOyster } from "@/lib/net/rpc";
import { weeksOwed } from "@/lib/sim/clock";
import { OYSTER_TOP_UPS, SELL_RATIO } from "@/lib/sim/constants";
import { formatSpan } from "@/lib/sim/londonClock";
import { formatPence } from "@/lib/sim/money";
import { weeklyBills } from "@/lib/sim/upkeep";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";
import { LedgerRow } from "./LedgerRow";

const POLL_MS = 3000;

export function Bank() {
  const balance = useGame((state) => state.balancePence);
  const oyster = useGame((state) => state.oysterPence);
  const ledger = useGame((state) => state.ledger);
  const heating = useGame((state) => state.heatingOn);
  const homeId = useGame((state) => state.homeId);
  const misses = useGame((state) => state.rentMisses);
  const sofa = useGame((state) => state.sofaSurfing);
  const gameMinutes = useGame((state) => state.gameMinutes);
  const last = useGame((state) => state.lastUpkeepMinute);
  const inventory = useGame((state) => state.inventory);
  const home = homesById[homeId];
  const stuffValue = inventory.reduce(
    (sum, item) => sum + Math.floor((catalogueById[item.itemId]?.pricePence ?? 0) * SELL_RATIO),
    0,
  );
  const due = weeksOwed(last, gameMinutes);
  const nextRent = 1440 * 6 + Math.max(0, Math.ceil((gameMinutes - 1440 * 6) / 10080)) * 10080;
  const rentIn = formatSpan(nextRent - gameMinutes);

  useEffect(() => {
    scheduleFlush();
    void refreshLedger();
    const poll = setInterval(() => {
      const unsettled = useGame.getState().ledger.some((entry) => entry.chainStatus && entry.chainStatus !== "settled");
      if (unsettled) scheduleFlush();
      void refreshLedger();
    }, POLL_MS);
    return () => clearInterval(poll);
  }, []);

  return (
    <div className="space-y-2 text-xs">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#ff5f6d] via-[#c2408f] to-[#4b3bbf] p-4 text-white shadow-lg">
        <span className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10" />
        <div className="text-[10px] font-bold tracking-wide opacity-80">MONZOISH CURRENT ACCOUNT</div>
        <div className={`mt-1 text-3xl font-extrabold ${balance < 0 ? "text-[#ffd0d0]" : ""}`}>
          {formatPence(balance)}
        </div>
        <div className="mt-2 flex justify-between text-[11px] opacity-90">
          <span>Worth {formatPence(balance + oyster + stuffValue)}</span>
          <span>🚇 Oyster {formatPence(oyster)}</span>
        </div>
        <div className="text-[10px] opacity-70">Overdraft to −£200 · furniture counted at resale value</div>
      </div>
      <p className="px-1 text-[10px] text-[#9aa5b1]">Every payment settles on Monad testnet.</p>
      <div className="rounded-2xl bg-white p-3 shadow-sm">
        <div className="font-bold">🏠 {home?.name}</div>
        <div>Weekly bills {formatPence(weeklyBills(home?.rentPence ?? 0, heating, sofa))}</div>
        <div className="text-[#5c6b7a]">
          {due > 0 ? `${due} week${due === 1 ? "" : "s"} due now` : `Rent comes out in ${rentIn} of play`}
        </div>
        {misses > 0 ? (
          <div className="font-bold text-[#e5484d]">Missed rent {misses}× — two and you&apos;re on a sofa</div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1">
        {OYSTER_TOP_UPS.map((pence) => (
          <button
            key={pence}
            type="button"
            className="rounded-full bg-[#1b2838] px-3 py-1.5 text-[11px] font-bold text-white"
            onClick={() => {
              void topUpOyster(pence).then((error) => {
                useUi.getState().pushToast(error ?? `Oyster +${formatPence(pence)}`, error ? "bad" : "good");
              });
            }}
          >
            🚇 +{formatPence(pence)}
          </button>
        ))}
        <button
          type="button"
          className={`rounded-full px-3 py-1.5 text-[11px] font-bold text-white ${heating ? "bg-[#e07b00]" : "bg-[#5c6b7a]"}`}
          onClick={() => {
            void setHeating(!heating).then((error) => {
              if (error) useUi.getState().pushToast(error, "bad");
            });
          }}
        >
          {heating ? "🔥 Heating on" : "🥶 Heating off"}
        </button>
      </div>
      <p className="pt-1 text-[10px] font-bold text-[#9aa5b1]">RECENT</p>
      <ul className="space-y-1">
        {ledger.map((entry) => (
          <LedgerRow key={entry.id} entry={entry} />
        ))}
      </ul>
    </div>
  );
}
