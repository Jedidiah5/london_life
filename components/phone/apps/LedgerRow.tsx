import { EXPLORER_TX } from "@/lib/chain/monad";
import { ledgerLabel } from "@/lib/content";
import { formatPence } from "@/lib/sim/money";
import type { LedgerEntry } from "@/lib/sim/types";

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

function ReceiptChip({ entry }: { entry: LedgerEntry }) {
  if (!entry.chainStatus) return null;
  if (entry.chainStatus === "settled" && entry.chainTx) {
    return (
      <a
        href={`${EXPLORER_TX}${entry.chainTx}`}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 whitespace-nowrap rounded-full bg-[#e6f6ec] px-1.5 py-0.5 text-[9px] font-bold text-[#22924f]"
      >
        On Monad ✓
      </a>
    );
  }
  return (
    <span className="shrink-0 whitespace-nowrap rounded-full bg-[#f1f3f5] px-1.5 py-0.5 text-[9px] font-bold text-[#5c6b7a]">
      ⏳ settling
    </span>
  );
}

export function LedgerRow({ entry }: { entry: LedgerEntry }) {
  return (
    <li className="flex items-center gap-2 rounded-xl bg-white px-2 py-1.5 shadow-sm">
      <span>{KIND_EMOJI[entry.kind] ?? "•"}</span>
      <span className="min-w-0 flex-1 leading-tight">{ledgerLabel(entry.kind, entry.ref)}</span>
      <ReceiptChip entry={entry} />
      <span className={`shrink-0 whitespace-nowrap font-bold ${entry.amountPence >= 0 ? "text-[#22924f]" : ""}`}>
        {entry.amountPence >= 0 ? "+" : ""}
        {formatPence(entry.amountPence)}
      </span>
    </li>
  );
}
