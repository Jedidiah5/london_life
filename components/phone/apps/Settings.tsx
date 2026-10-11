"use client";

import { useGame } from "@/lib/store/useGame";
import { supabaseConfigured } from "@/lib/net/supabase";

export function Settings() {
  const username = useGame((state) => state.username);
  const aspiration = useGame((state) => state.aspiration);
  const traits = useGame((state) => state.traits);
  const cloud = useGame((state) => state.cloud);
  const speed = useGame((state) => state.speed);
  return (
    <div className="space-y-2 text-xs">
      <p className="font-semibold">@{username}</p>
      <p>{traits.join(" · ")}</p>
      <p className="capitalize">{aspiration.replaceAll("_", " ")}</p>
      <p>{cloud ? "Cloud save is on. Money lives on the server." : "This browser is the only copy of your day."}</p>
      <p>{supabaseConfigured() ? "Supabase keys are set." : "Add the Supabase URL and anon key to .env.local, then run the SQL in supabase/migrations."}</p>
      <div className="flex gap-1">
        {([1, 2, 3] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={`rounded-full px-2 py-1 ${speed === value ? "bg-[#c8102e] text-white" : "bg-white"}`}
            onClick={() => useGame.getState().setSpeed(value)}
          >
            {value}× at home
          </button>
        ))}
      </div>
    </div>
  );
}
