"use client";

import { useUi } from "@/lib/store/useUi";

export function Toasts() {
  const toasts = useUi((state) => state.toasts);
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none flex flex-col items-center gap-1">
      {toasts.map((toast) => (
        <div key={toast.id} className="rounded-full bg-[#1b2838] px-3 py-1 text-xs text-[#f4efe6] shadow">
          {toast.text}
        </div>
      ))}
    </div>
  );
}
