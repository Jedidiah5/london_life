"use client";

import { homesById } from "@/lib/content";
import { setHeating, topUpOyster } from "@/lib/net/rpc";
import { OYSTER_TOP_UPS } from "@/lib/sim/constants";
import { weeksOwed } from "@/lib/sim/clock";
import { formatPence } from "@/lib/sim/money";
import { weeklyBills } from "@/lib/sim/upkeep";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";

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
  const cloud = useGame((state) => state.cloud);
  const home = homesById[homeId];
  const due = weeksOwed(last, gameMinutes);

  return (
    <div className="space-y-2 text-xs">
      <div className="rounded-xl bg-white p-2">
        <div className="text-[11px] text-[#5c6b7a]">Balance</div>
        <div className="text-lg font-semibold">{formatPence(balance)}</div>
        <div>Oyster {formatPence(oyster)}</div>
      </div>
      <div className="rounded-xl bg-white p-2">
        <div className="font-semibold">{home?.name}</div>
        <div>Weekly bills {formatPence(weeklyBills(home?.rentPence ?? 0, heating, sofa))}</div>
        <div>{due > 0 ? `${due} week${due === 1 ? "" : "s"} due` : "Rent settles Sunday 00:00"}</div>
        {misses > 0 ? <div className="text-[#c8102e]">Missed rent {misses} time{misses === 1 ? "" : "s"}</div> : null}
      </div>
      <div className="flex flex-wrap gap-1">
        {OYSTER_TOP_UPS.map((pence) => (
          <button
            key={pence}
            type="button"
            className="rounded-full bg-[#1b2838] px-2 py-1 text-[11px] text-[#f4efe6]"
            onClick={() => {
              if (!cloud) {
                useUi.getState().pushToast("Connect Supabase to top up");
                return;
              }
              void topUpOyster(pence).then((error) => {
                if (error) useUi.getState().pushToast(error);
              });
            }}
          >
            Top up {formatPence(pence)}
          </button>
        ))}
        <button
          type="button"
          className="rounded-full bg-[#c8102e] px-2 py-1 text-[11px] text-white"
          onClick={() => {
            if (!cloud) {
              useGame.getState().setHeatingLocal(!heating);
              return;
            }
            void setHeating(!heating).then((error) => {
              if (error) useUi.getState().pushToast(error);
            });
          }}
        >
          Heating {heating ? "on" : "off"}
        </button>
      </div>
      <ul className="space-y-1">
        {ledger.map((entry) => (
          <li key={entry.id} className="flex justify-between rounded-lg bg-white px-2 py-1">
            <span>{entry.kind}</span>
            <span>{formatPence(entry.amountPence)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
