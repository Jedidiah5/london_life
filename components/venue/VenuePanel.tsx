"use client";

import { Flag } from "@/components/Flag";
import { useEffect, useMemo, useState } from "react";
import { menusById, nationalitiesById, roomLayout, venuesById } from "@/lib/content";
import { crowdFor } from "@/lib/crowd";
import { broadcastChat } from "@/lib/net/realtime";
import { useGame } from "@/lib/store/useGame";
import { usePresence } from "@/lib/store/usePresence";
import { useUi } from "@/lib/store/useUi";
import { useLondonTime } from "@/lib/useNow";

const QUICK = ["Mind the gap", "Cheers!", "Lovely weather 🌧️", "Anyone for a pint?"];

export function VenuePanel() {
  const location = useGame((state) => state.location);
  const homeId = useGame((state) => state.homeId);
  const hour = useLondonTime().hour;
  const origin = useGame((state) => state.appearance.origin);
  const here = usePresence((state) => state.here);
  const chat = usePresence((state) => state.chat);
  const sheet = useUi((state) => state.sheet);
  const person = useUi((state) => state.person);
  const nav = useUi((state) => state.nav);
  const [text, setText] = useState("");
  const [line, setLine] = useState(0);
  const [open, setOpen] = useState(true);
  const venue = venuesById[location];
  const layout = roomLayout(location, homeId, null);
  const crowd = useMemo(
    () => crowdFor(location, layout, hour * 60),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location, hour, layout.id],
  );

  useEffect(() => {
    const id = window.setInterval(() => setLine((value) => value + 1), 7000);
    return () => window.clearInterval(id);
  }, []);

  if (!venue || location === "home" || sheet || person || nav !== "home") return null;
  const nation = nationalitiesById[origin];
  const spots = venue.fixtures.filter((fixture) => fixture.menu);
  const people = crowd.length + here.length + 1;
  const flavour = venue.flavour[line % Math.max(1, venue.flavour.length)];
  const recent = chat.slice(-3);

  const send = (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    broadcastChat(clean);
    setText("");
    useGame.getState().bumpNeeds({ social: 2 });
    const replier = crowd[Math.floor(Math.random() * crowd.length)];
    if (replier && Math.random() < 0.7) {
      const replyNation = nationalitiesById[replier.local.origin];
      const reply =
        Math.random() < 0.5 && replyNation ? replyNation.greeting : (replier.local.lines[Math.floor(Math.random() * replier.local.lines.length)] ?? "Ha!");
      window.setTimeout(() => {
        usePresence.getState().pushChat({
          id: `npc-${Date.now()}`,
          from: replier.local.name,
          simId: replier.local.id,
          text: reply,
          at: Date.now(),
        });
      }, 1200);
    }
  };

  return (
    <section className="pointer-events-auto mx-auto w-full max-w-md rounded-3xl bg-white/95 p-2.5 text-[#1b2838] shadow-2xl">
      <button type="button" className="flex w-full items-center gap-2 text-left" onClick={() => setOpen((value) => !value)}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#f1ede6] text-xl">{venue.emoji}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold leading-tight">{venue.name}</span>
          <span className="block truncate text-[11px] text-[#5c6b7a]">{flavour ?? venue.district}</span>
        </span>
        <span className="flex items-center gap-1 rounded-full bg-[#e9f9ef] px-2 py-1 text-[11px] font-bold text-[#22924f]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#3ccf6e]" /> {people} here
        </span>
      </button>
      {open ? (
        <>
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
            {spots.map((spot) => (
              <button
                key={spot.id}
                type="button"
                className="flex shrink-0 items-center gap-1 rounded-full bg-[#f1ede6] px-3 py-1.5 text-[12px] font-semibold"
                onClick={() => useUi.getState().openSheet(spot.id)}
              >
                <span>{spot.emoji ?? menusById[spot.menu ?? ""]?.emoji}</span>
                {spot.label}
              </button>
            ))}
          </div>
          <div className="mt-1 flex gap-1 overflow-x-auto pb-1">
            {crowd.map((member) => (
              <button
                key={member.local.id}
                type="button"
                onClick={() => useUi.getState().openPerson({ kind: "local", id: member.local.id })}
                className="flex shrink-0 items-center gap-1 rounded-full border border-[#ece7de] px-2 py-0.5 text-[11px]"
              >
                <span
                  className="h-4 w-4 rounded-full border border-white"
                  style={{ background: `radial-gradient(circle at 50% 40%, ${member.local.look.skin} 0 45%, ${member.local.look.top} 46%)` }}
                />
                <Flag origin={member.local.origin} /> {member.local.name}
              </button>
            ))}
            {here.map((player) => (
              <button
                key={player.simId}
                type="button"
                onClick={() => useUi.getState().openPerson({ kind: "player", id: player.simId })}
                className="flex shrink-0 items-center gap-1 rounded-full border border-[#3ccf6e] px-2 py-0.5 text-[11px] font-semibold"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#3ccf6e]" /> {player.name}
              </button>
            ))}
          </div>
          {recent.length > 0 ? (
            <div className="mt-1 space-y-0.5 rounded-2xl bg-[#f8f6f1] px-2 py-1 text-[11px]">
              {recent.map((entry) => (
                <p key={entry.id} className="truncate">
                  <b>{entry.from}:</b> {entry.text}
                </p>
              ))}
            </div>
          ) : null}
          <div className="mt-1.5 flex gap-1 overflow-x-auto">
            {[nation ? nation.greeting : null, ...QUICK].filter(Boolean).map((quick) => (
              <button
                key={quick}
                type="button"
                className="shrink-0 rounded-full bg-[#e7f0ff] px-2 py-1 text-[10px] font-semibold text-[#1f4b99]"
                onClick={() => send(quick ?? "")}
              >
                {quick}
              </button>
            ))}
          </div>
          <form
            className="mt-1.5 flex gap-1"
            onSubmit={(event) => {
              event.preventDefault();
              send(text);
            }}
          >
            <input
              value={text}
              maxLength={140}
              onChange={(event) => setText(event.target.value)}
              placeholder={`Say something to the ${people - 1} people here…`}
              className="min-w-0 flex-1 rounded-full bg-[#f1ede6] px-3 py-2 text-[12px]"
            />
            <button type="submit" className="rounded-full bg-[#1b2838] px-3 text-[12px] font-bold text-white">
              Send
            </button>
          </form>
        </>
      ) : null}
    </section>
  );
}
