"use client";

import { Flag } from "@/components/Flag";
import { useState } from "react";
import { nationalitiesById } from "@/lib/content";
import { resetSandbox } from "@/lib/net/rpc";
import { offlineBecause, supabaseConfigured } from "@/lib/net/supabase";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";

export function Settings() {
  const username = useGame((state) => state.username);
  const aspiration = useGame((state) => state.aspiration);
  const traits = useGame((state) => state.traits);
  const appearance = useGame((state) => state.appearance);
  const [confirm, setConfirm] = useState(false);
  const online = supabaseConfigured();
  const nation = nationalitiesById[appearance.origin];
  return (
    <div className="space-y-2 text-xs">
      <div className="rounded-2xl bg-white p-3 shadow-sm">
        <p className="font-bold">@{username}</p>
        <p>
          {nation ? <Flag origin={nation.id} /> : null} {appearance.londonBorn ? `London-born, ${nation?.demonym} roots` : `From ${nation?.label}`}
        </p>
        <p>{traits.join(" · ")}</p>
        <p className="capitalize">Dream: {aspiration.replaceAll("_", " ")}</p>
      </div>
      <div className="rounded-2xl bg-white p-3 shadow-sm">
        <p className="font-bold">{online ? "☁️ Online city" : "📴 Offline mode"}</p>
        <p className="text-[#5c6b7a]">
          {online
            ? "Money, skills and jobs live on the server."
            : "A local server in this browser runs the same rules as the cloud. Add Supabase keys in .env.local to play with others."}
        </p>
        {offlineBecause() ? <p className="mt-1 text-[11px] text-[#e5484d]">Supabase said: {offlineBecause()}</p> : null}
      </div>
      {!online ? (
        confirm ? (
          <div className="flex gap-1">
            <button
              type="button"
              className="flex-1 rounded-full bg-[#e5484d] py-2 font-bold text-white"
              onClick={() => {
                resetSandbox();
                useUi.getState().setNav("home");
              }}
            >
              Yes, start over
            </button>
            <button type="button" className="rounded-full bg-white px-4 py-2 font-semibold shadow-sm" onClick={() => setConfirm(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" className="w-full rounded-full bg-white py-2 font-semibold text-[#e5484d] shadow-sm" onClick={() => setConfirm(true)}>
            Start a new life
          </button>
        )
      ) : null}
    </div>
  );
}
