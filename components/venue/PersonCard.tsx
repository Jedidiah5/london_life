"use client";

import { Flag } from "@/components/Flag";
import { useState } from "react";
import { locals, nationalitiesById } from "@/lib/content";
import { addFriend, greet, sendGift } from "@/lib/net/rpc";
import { broadcastEmote } from "@/lib/net/realtime";
import { supabaseConfigured } from "@/lib/net/supabase";
import type { Appearance } from "@/lib/sim/types";
import { useGame } from "@/lib/store/useGame";
import { usePresence } from "@/lib/store/usePresence";
import { useUi } from "@/lib/store/useUi";

function Face({ look }: { look: Appearance }) {
  return (
    <div
      className="h-14 w-14 shrink-0 rounded-full border-4 border-white shadow"
      style={{ background: `radial-gradient(circle at 50% 38%, ${look.skin} 0 38%, ${look.top} 39%)` }}
    />
  );
}

export function PersonCard() {
  const person = useUi((state) => state.person);
  const here = usePresence((state) => state.here);
  const origin = useGame((state) => state.appearance.origin);
  const [said, setSaid] = useState<string | null>(null);
  const [greeted, setGreeted] = useState<string[]>([]);
  if (!person) return null;
  const mine = nationalitiesById[origin];
  const close = () => {
    setSaid(null);
    useUi.getState().openPerson(null);
  };

  if (person.kind === "local") {
    const local = locals.find((entry) => entry.id === person.id);
    if (!local) return null;
    const nation = nationalitiesById[local.origin];
    const sameRoots = local.origin === origin;
    const wave = async () => {
      const error = await greet(local.id);
      if (error) {
        useUi.getState().pushToast(error, "bad");
        return;
      }
      const first = !greeted.includes(local.id);
      setGreeted((list) => [...list, local.id]);
      if (sameRoots && nation) {
        setSaid(`No way, you're ${nation.demonym} too? ${nation.greeting} We should get ${nation.dish} sometime.`);
        if (first) {
          useGame.getState().bumpNeeds({ social: 18 });
          useGame.getState().addMoodlet({ id: "same_roots", label: "Met someone from home", emoji: "🫂", value: 8 });
        }
      } else {
        setSaid(`${nation?.greeting ?? "Hello!"} ${local.lines[0] ?? ""}`);
        if (first) useGame.getState().bumpNeeds({ social: 10 });
      }
    };
    return (
      <section className="pointer-events-auto mx-auto w-full max-w-md rounded-3xl bg-white p-3 text-[#1b2838] shadow-2xl">
        <div className="flex items-start gap-3">
          <Face look={local.look} />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold">
              <Flag origin={local.origin} size="md" /> {local.name}
            </h2>
            <p className="text-[12px] text-[#5c6b7a]">
              Londoner · roots in {nation?.label ?? "somewhere"}
              {sameRoots ? " · same as you!" : ""}
            </p>
          </div>
          <button type="button" className="grid h-8 w-8 place-items-center rounded-full bg-[#f1ede6]" onClick={close}>
            ✕
          </button>
        </div>
        <div className="mt-2 rounded-2xl bg-[#f8f6f1] p-2 text-[13px]">
          “{said ?? local.lines[(local.name.length + local.id.length) % local.lines.length]}”
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <button type="button" className="rounded-2xl bg-[#1b2838] py-2 text-[12px] font-bold text-white" onClick={() => void wave()}>
            👋 Wave
          </button>
          <button
            type="button"
            className="rounded-2xl bg-[#f1ede6] py-2 text-[12px] font-semibold"
            onClick={() => setSaid(local.lines[Math.floor(Math.random() * local.lines.length)] ?? "…")}
          >
            💬 Chat
          </button>
          <button
            type="button"
            className="rounded-2xl bg-[#f1ede6] py-2 text-[12px] font-semibold"
            onClick={() => {
              if (!mine) return;
              setSaid(
                local.origin === origin
                  ? `${mine.greeting}! Ah, you sound like home.`
                  : `"${mine.greeting}"? Is that how they say it in ${mine.label}? I love it.`,
              );
              useGame.getState().bumpNeeds({ social: 4 });
            }}
          >
            {mine ? <Flag origin={mine.id} /> : null} Say “{mine?.greeting}”
          </button>
        </div>
      </section>
    );
  }

  const player = here.find((entry) => entry.simId === person.id);
  if (!player) return null;
  const nation = nationalitiesById[player.appearance.origin];
  const online = supabaseConfigured();
  return (
    <section className="pointer-events-auto mx-auto w-full max-w-md rounded-3xl bg-white p-3 text-[#1b2838] shadow-2xl">
      <div className="flex items-start gap-3">
        <Face look={player.appearance} />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold">
            {nation ? <Flag origin={nation.id} size="md" /> : null} {player.name}
          </h2>
          <p className="flex items-center gap-1 text-[12px] text-[#22924f]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3ccf6e]" /> Real player · here now
          </p>
        </div>
        <button type="button" className="grid h-8 w-8 place-items-center rounded-full bg-[#f1ede6]" onClick={close}>
          ✕
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          className="rounded-2xl bg-[#1b2838] py-2 text-[12px] font-bold text-white"
          onClick={() => {
            broadcastEmote("wave");
            void greet(player.simId).then((error) => {
              if (error) useUi.getState().pushToast(error, "bad");
              else useUi.getState().pushToast(`You waved at ${player.name}`, "good");
            });
            useGame.getState().bumpNeeds({ social: 8 });
          }}
        >
          👋 Wave
        </button>
        <button
          type="button"
          disabled={!online}
          className="rounded-2xl bg-[#f1ede6] py-2 text-[12px] font-semibold disabled:opacity-50"
          onClick={() => void addFriend(player.name).then((error) => useUi.getState().pushToast(error ?? "Friend added", error ? "bad" : "good"))}
        >
          🤝 Add friend
        </button>
        <button
          type="button"
          disabled={!online}
          className="rounded-2xl bg-[#f1ede6] py-2 text-[12px] font-semibold disabled:opacity-50"
          onClick={() => void sendGift(player.simId, 500).then((error) => useUi.getState().pushToast(error ?? "Sent £5", error ? "bad" : "good"))}
        >
          🎁 Gift £5
        </button>
        <button
          type="button"
          className="rounded-2xl bg-[#f1ede6] py-2 text-[12px] font-semibold"
          onClick={() => {
            broadcastEmote("compliment");
            useUi.getState().pushToast("Compliment sent");
          }}
        >
          🧥 Nice coat
        </button>
      </div>
    </section>
  );
}
