"use client";

import { useGame } from "@/lib/store/useGame";

const RING = 2 * Math.PI * 15;

/** What the Sim is doing right now, with a ring that fills as it goes. Tap to stop. */
export function ActionChip() {
  const action = useGame((state) => state.action);
  const pending = useGame((state) => state.pending);
  const queue = useGame((state) => state.queue);
  const shift = useGame((state) => state.shift);
  const readOnly = useGame((state) => state.readOnly);
  const doing = action ?? pending;
  if (!doing || shift || readOnly) return null;
  const done = action ? 1 - action.remainingMinutes / Math.max(1, action.totalMinutes) : 0;

  return (
    <button
      type="button"
      className="pointer-events-auto flex w-56 items-center gap-2 rounded-2xl bg-white/95 p-1.5 pr-3 text-left text-[#1b2838] shadow-lg"
      onClick={() => useGame.getState().cancelAction()}
      aria-label={`Stop ${doing.label}`}
    >
      <span className="relative grid h-9 w-9 shrink-0 place-items-center">
        <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e1d8" strokeWidth="3.5" />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="#3ccf6e"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={RING}
            strokeDashoffset={RING * (1 - done)}
            className="transition-[stroke-dashoffset] duration-500"
          />
        </svg>
        <span className="text-base">{doing.emoji}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-bold">
          {action ? doing.label : `On the way · ${doing.label}`}
        </span>
        <span className="block text-[10px] text-[#5c6b7a]">
          ✕ tap to stop{queue.length > 0 ? ` · ${queue.length} up next` : ""}
        </span>
      </span>
    </button>
  );
}
