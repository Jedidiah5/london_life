"use client";

import { useUi } from "@/lib/store/useUi";

const TONES = {
  info: "bg-[#1b2838] text-white",
  good: "bg-[#3ccf6e] text-white",
  bad: "bg-[#e5484d] text-white",
};

export function Toasts() {
  const toasts = useUi((state) => state.toasts);
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none flex flex-col items-end gap-1">
      {toasts.map((toast) => (
        <div key={toast.id} className={`max-w-64 rounded-2xl px-3 py-1.5 text-xs font-semibold shadow-lg ${TONES[toast.tone]}`}>
          {toast.text}
        </div>
      ))}
    </div>
  );
}
