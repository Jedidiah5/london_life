"use client";

import { useState } from "react";
import { actionsById, events, nationalitiesById } from "@/lib/content";
import { performAction } from "@/lib/net/rpc";
import { capitalise } from "@/lib/sim/actions";
import { checkChance, fillTemplate, passesCheck } from "@/lib/sim/events";
import { formatPence } from "@/lib/sim/money";
import type { EventChoice, EventOutcome } from "@/lib/sim/types";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";

export function EventModal() {
  const eventId = useUi((state) => state.eventId);
  const origin = useGame((state) => state.appearance.origin);
  const skills = useGame((state) => state.skills);
  const [result, setResult] = useState<{ outcome: EventOutcome; passed: boolean | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const event = events.find((entry) => entry.id === eventId);
  if (!event) return null;
  const nation = nationalitiesById[origin] ?? null;
  const fill = (text: string) => fillTemplate(text, nation);

  const close = () => {
    setResult(null);
    useUi.getState().setEvent(null);
  };

  const apply = (outcome: EventOutcome, passed: boolean | null) => {
    const game = useGame.getState();
    if (outcome.moodlet) {
      game.addMoodlet({ id: `event_${event.id}`, label: outcome.moodlet.label, emoji: outcome.moodlet.emoji, value: outcome.moodlet.value });
    }
    if (outcome.needs) game.bumpNeeds(outcome.needs);
    setResult({ outcome, passed });
  };

  const choose = async (choice: EventChoice) => {
    if (choice.action) {
      setBusy(true);
      const error = await performAction(choice.action, null);
      setBusy(false);
      if (error) {
        useUi.getState().pushToast(error, "bad");
        return;
      }
      apply(choice.success, null);
      return;
    }
    if (choice.check) {
      const passed = passesCheck(skills[choice.check.skill] ?? 0, choice.check.difficulty, Math.random());
      apply(passed ? choice.success : (choice.fail ?? choice.success), passed);
      return;
    }
    apply(choice.success, null);
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-30 grid place-items-center bg-[#0b1520]/55 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-4 text-[#1b2838] shadow-2xl">
        <div className="mb-2 text-center text-5xl">{event.emoji}</div>
        <h2 className="text-center text-xl font-extrabold">{event.title}</h2>
        {result ? (
          <>
            {result.passed !== null ? (
              <p className={`mt-2 text-center text-sm font-bold ${result.passed ? "text-[#22924f]" : "text-[#e5484d]"}`}>
                {result.passed ? "Success!" : "Not quite…"}
              </p>
            ) : null}
            <p className="mt-2 text-center text-[14px]">{fill(result.outcome.text)}</p>
            {result.outcome.moodlet ? (
              <p className="mt-2 text-center text-[12px] font-semibold">
                {result.outcome.moodlet.emoji} {result.outcome.moodlet.label} ({result.outcome.moodlet.value > 0 ? "+" : ""}
                {result.outcome.moodlet.value} mood)
              </p>
            ) : null}
            <button type="button" className="mt-4 w-full rounded-full bg-[#1b2838] py-3 text-sm font-bold text-white" onClick={close}>
              Carry on
            </button>
          </>
        ) : (
          <>
            <p className="mt-2 text-center text-[14px] text-[#3a4a5a]">{fill(event.text)}</p>
            <div className="mt-4 space-y-2">
              {event.choices.map((choice) => {
                const cost = choice.action ? (actionsById[choice.action]?.costPence ?? 0) : 0;
                const chance = choice.check ? checkChance(skills[choice.check.skill] ?? 0, choice.check.difficulty) : null;
                return (
                  <button
                    key={choice.label}
                    type="button"
                    disabled={busy}
                    onClick={() => void choose(choice)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-[#ece7de] bg-[#fbfaf7] p-3 text-left active:scale-[0.98]"
                  >
                    <span className="text-2xl">{choice.emoji}</span>
                    <span className="flex-1">
                      <span className="block text-[14px] font-bold">{fill(choice.label)}</span>
                      <span className="block text-[11px] text-[#5c6b7a]">
                        {choice.action
                          ? cost > 0
                            ? `Safe · ${formatPence(cost)}`
                            : "Safe · free"
                          : choice.check
                            ? `${capitalise(choice.check.skill)} check · ${Math.round((chance ?? 0) * 100)}% chance`
                            : "Just do it"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
