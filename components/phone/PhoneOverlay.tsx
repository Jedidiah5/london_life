"use client";

import { useUi, type PhoneApp } from "@/lib/store/useUi";
import { Bank } from "./apps/Bank";
import { Friends } from "./apps/Friends";
import { Jobs } from "./apps/Jobs";
import { Messages } from "./apps/Messages";
import { Settings } from "./apps/Settings";

const APPS: { id: PhoneApp; label: string }[] = [
  { id: "jobs", label: "Jobs" },
  { id: "bank", label: "Bank" },
  { id: "messages", label: "Messages" },
  { id: "friends", label: "Friends" },
  { id: "settings", label: "Settings" },
];

export function PhoneOverlay() {
  const nav = useUi((state) => state.nav);
  const app = useUi((state) => state.phoneApp);
  if (nav !== "phone") return null;

  return (
    <section className="pointer-events-auto mx-auto w-full max-w-sm rounded-[28px] bg-[#1b2838] p-3 text-[#f4efe6] shadow-2xl">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-semibold">Phone</span>
        <button type="button" onClick={() => useUi.getState().setNav("home")}>
          Close
        </button>
      </div>
      {app === null ? null : (
        <div className="mb-2 flex gap-1 overflow-x-auto">
          {APPS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`rounded-full px-2 py-1 text-[11px] ${app === entry.id ? "bg-[#c8102e]" : "bg-white/10"}`}
              onClick={() => useUi.getState().openPhone(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      )}
      <div className="max-h-64 overflow-y-auto rounded-2xl bg-[#f4efe6] p-3 text-[#1b2838]">
        {app === "jobs" ? <Jobs /> : null}
        {app === "bank" ? <Bank /> : null}
        {app === "messages" ? <Messages /> : null}
        {app === "friends" ? <Friends /> : null}
        {app === "settings" ? <Settings /> : null}
      </div>
    </section>
  );
}
