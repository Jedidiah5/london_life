"use client";

import { homesById } from "@/lib/content";
import { setHeating, topUpOyster } from "@/lib/net/rpc";
import { weeksOwed } from "@/lib/sim/clock";
import { OYSTER_TOP_UPS } from "@/lib/sim/constants";
import { formatSpan } from "@/lib/sim/londonClock";
import { formatPence } from "@/lib/sim/money";
import { weeklyBills } from "@/lib/sim/upkeep";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";

const KIND_EMOJI: Record<string, string> = {
  wage: "💷",
  rent: "🏠",
  bill: "🧾",
  purchase: "🛍️",
  sale: "♻️",
  travel: "🚇",
  gift: "🎁",
  goal: "🏆",
};

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
  const home = homesById[homeId];
  const due = weeksOwed(last, gameMinutes);
  const nextRent = 1440 * 6 + Math.max(0, Math.ceil((gameMinutes - 1440 * 6) / 10080)) * 10080;
  const rentIn = formatSpan(nextRent - gameMinutes);

  return (
    <div className="space-y-2 text-xs">
      <div className="rounded-2xl bg-gradient-to-br from-[#1b2838] to-[#2f4a6b] p-3 text-white shadow">
        <div className="text-[10px] font-bold opacity-70">MONZOISH CURRENT ACCOUNT</div>
        <div className={`text-2xl font-extrabold ${balance < 0 ? "text-[#ff8a8a]" : ""}`}>{formatPence(balance)}</div>
        <div className="text-[11px] opacity-80">Overdraft to −£200 · Oyster {formatPence(oyster)}</div>
      </div>
      <div className="rounded-2xl bg-white p-3 shadow-sm">
        <div className="font-bold">🏠 {home?.name}</div>
        <div>Weekly bills {formatPence(weeklyBills(home?.rentPence ?? 0, heating, sofa))}</div>
        <div className="text-[#5c6b7a]">
          {due > 0 ? `${due} week${due === 1 ? "" : "s"} due now` : `Rent comes out in ${rentIn} of play`}
        </div>
        {misses > 0 ? <div className="font-bold text-[#e5484d]">Missed rent {misses}× — two and you&apos;re on a sofa</div> : null}
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
        {ledger.slice(0, 15).map((entry) => (
          <li key={entry.id} className="flex items-center gap-2 rounded-xl bg-white px-2 py-1.5 shadow-sm">
            <span>{KIND_EMOJI[entry.kind] ?? "•"}</span>
            <span className="flex-1 truncate capitalize">{entry.ref?.replaceAll("_", " ") ?? entry.kind}</span>
            <span className={`font-bold ${entry.amountPence >= 0 ? "text-[#22924f]" : ""}`}>
              {entry.amountPence >= 0 ? "+" : ""}
              {formatPence(entry.amountPence)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
