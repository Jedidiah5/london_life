"use client";

import dynamic from "next/dynamic";
import { Flag } from "@/components/Flag";
import { SKILL_EMOJI, SKILL_HOW } from "@/components/phone/apps/Skills";
import { goals, jobsById, nationalitiesById, venuesById } from "@/lib/content";
import { claimGoal } from "@/lib/net/rpc";
import { capitalise } from "@/lib/sim/actions";
import { jobLocked, titleFor } from "@/lib/sim/career";
import { ASPIRATIONS, LEVEL_PAY_STEP, NEED_LABELS, SHIFTS_PER_LEVEL, SKILL_KEYS, SKILL_MAX } from "@/lib/sim/constants";
import { goalReady, nextGoal } from "@/lib/sim/goals";
import { formatPence } from "@/lib/sim/money";
import { activeMoodlets, moodBand, moodScore } from "@/lib/sim/mood";
import { NEED_KEYS } from "@/lib/sim/types";
import { useGame } from "@/lib/store/useGame";
import { useUi, type SimTab } from "@/lib/store/useUi";
import { NEED_EMOJI } from "./NeedsPanel";

const AvatarPreview = dynamic(() => import("@/components/create/AvatarPreview"), { ssr: false });

const TABS: { id: SimTab; label: string; emoji: string }[] = [
  { id: "profile", label: "Profile", emoji: "🪪" },
  { id: "needs", label: "Needs", emoji: "❤️" },
  { id: "goals", label: "Goals", emoji: "🎯" },
  { id: "skills", label: "Skills", emoji: "📈" },
  { id: "career", label: "Career", emoji: "💼" },
];

function needColour(value: number): string {
  if (value < 25) return "#e5484d";
  if (value < 50) return "#f5a524";
  return "#3ccf6e";
}

function Profile() {
  const name = useGame((state) => state.name);
  const username = useGame((state) => state.username);
  const appearance = useGame((state) => state.appearance);
  const traits = useGame((state) => state.traits);
  const aspiration = useGame((state) => state.aspiration);
  const homeOrigin = nationalitiesById[appearance.origin];
  return (
    <div className="space-y-2">
      <div className="relative h-56 overflow-hidden rounded-3xl bg-gradient-to-b from-[#dfe9ff] to-[#f6f1ff]">
        <AvatarPreview look={appearance} />
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-[#5c6b7a]">
          Turning slowly
        </span>
      </div>
      <Row label="Name" value={name} />
      <Row label="Username" value={`@${username}`} />
      <Row
        label="From"
        value={
          <span className="flex items-center gap-1">
            <Flag origin={appearance.origin} /> {homeOrigin?.label ?? "London"}
          </span>
        }
      />
      <Row label="Traits" value={traits.join(" · ") || "None yet"} />
      <Row
        label="Dream"
        value={ASPIRATIONS.find((entry) => entry.id === aspiration)?.label ?? capitalise(aspiration)}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-[#f6f7f9] px-3 py-2 text-[12px]">
      <span className="text-[#5c6b7a]">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function NeedsTab() {
  const needs = useGame((state) => state.needs);
  const moodlets = useGame((state) => state.moodlets);
  const gameMinutes = useGame((state) => state.gameMinutes);
  const heatingOn = useGame((state) => state.heatingOn);
  const feelings = activeMoodlets(moodlets, gameMinutes);
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {NEED_KEYS.map((key) => (
          <div key={key} className="flex items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f1f3f6] text-lg">
              {NEED_EMOJI[key]}
            </span>
            <div className="flex-1">
              <div className="flex justify-between text-[11px] font-semibold">
                <span>{NEED_LABELS[key]}</span>
                <span>{Math.round(needs[key])}%</span>
              </div>
              <div className="mt-0.5 h-2.5 overflow-hidden rounded-full bg-[#1b2838]/10">
                <div
                  className="h-full rounded-full transition-[width] duration-700"
                  style={{ width: `${needs[key]}%`, background: needColour(needs[key]) }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div>
        <h3 className="mb-1 text-[11px] font-extrabold tracking-wide text-[#9aa5b1]">FEELINGS</h3>
        {feelings.length === 0 && heatingOn ? (
          <p className="rounded-2xl bg-[#f6f7f9] p-3 text-[11px] text-[#5c6b7a]">
            Nothing special. Eat well, see people and do fun things to feel something.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {feelings.map((feeling) => (
              <div key={feeling.id} className="flex items-center gap-2 rounded-2xl bg-[#f6f7f9] p-2">
                <span className="text-xl">{feeling.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-bold">{feeling.label}</div>
                  <div className={`text-[10px] font-bold ${feeling.value >= 0 ? "text-[#16a34a]" : "text-[#c8102e]"}`}>
                    {feeling.value >= 0 ? "+" : ""}
                    {feeling.value} mood
                  </div>
                </div>
              </div>
            ))}
            {!heatingOn ? (
              <div className="flex items-center gap-2 rounded-2xl bg-[#f6f7f9] p-2">
                <span className="text-xl">🥶</span>
                <div>
                  <div className="text-[11px] font-bold">Heating&apos;s off</div>
                  <div className="text-[10px] font-bold text-[#c8102e]">-15 mood</div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function GoalsTab() {
  const done = useGame((state) => state.goalsDone);
  const stats = useGame((state) => state.stats);
  const aspiration = useGame((state) => state.aspiration);
  const next = nextGoal(goals, done);
  const dream = ASPIRATIONS.find((entry) => entry.id === aspiration)?.label ?? capitalise(aspiration);
  return (
    <div className="space-y-2">
      {next ? (
        <div className="rounded-3xl bg-gradient-to-br from-[#ffe27a] to-[#ffb84d] p-3 text-[#3d2a00]">
          <div className="text-[10px] font-extrabold tracking-wide opacity-70">RIGHT NOW</div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-2xl">{next.emoji}</span>
            <div className="flex-1">
              <div className="text-sm font-extrabold">{next.title}</div>
              <div className="text-[11px] opacity-80">{next.hint}</div>
            </div>
            <span className="rounded-full bg-white/60 px-2 py-0.5 text-[11px] font-bold">
              +{formatPence(next.rewardPence)}
            </span>
          </div>
          <Progress value={Math.min(stats[next.stat] ?? 0, next.count)} max={next.count} tone="#3d2a00" />
        </div>
      ) : null}
      <div className="rounded-3xl bg-gradient-to-br from-[#7b5cff] to-[#c057d9] p-3 text-white">
        <div className="text-[10px] font-extrabold tracking-wide opacity-75">LIFE DREAM</div>
        <div className="text-sm font-extrabold">{dream}</div>
        <div className="text-[11px] opacity-85">
          {done.length} of {goals.length} London milestones done
        </div>
        <Progress value={done.length} max={goals.length} tone="#ffffff" />
      </div>
      <h3 className="pt-1 text-[11px] font-extrabold tracking-wide text-[#9aa5b1]">MILESTONES</h3>
      <div className="space-y-1.5">
        {goals.map((goal) => {
          const finished = done.includes(goal.id);
          const ready = !finished && goalReady(goal, stats);
          return (
            <div
              key={goal.id}
              className={`flex items-center gap-2 rounded-2xl p-2 ${finished ? "bg-[#eafaf0]" : "bg-[#f6f7f9]"}`}
            >
              <span className="text-lg">{finished ? "✅" : goal.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className={`truncate text-[12px] font-bold ${finished ? "text-[#5c6b7a] line-through" : ""}`}>
                  {goal.title}
                </div>
                <div className="truncate text-[10px] text-[#5c6b7a]">{goal.hint}</div>
              </div>
              {ready ? (
                <button
                  type="button"
                  className="rounded-full bg-[#3ccf6e] px-2.5 py-1 text-[11px] font-bold text-white"
                  onClick={() => {
                    void claimGoal(goal.id).then((result) => {
                      if (typeof result === "string") useUi.getState().pushToast(result, "bad");
                      else useUi.getState().pushToast(`Goal done! +${formatPence(result)}`, "good");
                    });
                  }}
                >
                  Claim {formatPence(goal.rewardPence)}
                </button>
              ) : (
                <span className="text-[11px] font-bold text-[#9aa5b1]">{formatPence(goal.rewardPence)}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Progress({ value, max, tone }: { value: number; max: number; tone: string }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/15">
        <div
          className="h-full rounded-full"
          style={{ width: `${(value / Math.max(1, max)) * 100}%`, background: tone }}
        />
      </div>
      <span className="text-[10px] font-bold">
        {value}/{max}
      </span>
    </div>
  );
}

function SkillsTab() {
  const skills = useGame((state) => state.skills);
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-[#5c6b7a]">Skills only grow by doing them. Higher levels unlock better jobs.</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SKILL_KEYS.map((key) => {
          const value = skills[key] ?? 0;
          const level = Math.floor(value);
          return (
            <div key={key} className="rounded-2xl bg-[#f6f7f9] p-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">{SKILL_EMOJI[key]}</span>
                <div className="flex-1">
                  <div className="text-[12px] font-bold">{capitalise(key)}</div>
                  <div className="text-[10px] text-[#5c6b7a]">Level {level}</div>
                </div>
              </div>
              <div className="mt-1.5 flex gap-0.5">
                {Array.from({ length: SKILL_MAX }, (_, index) => {
                  const fill = Math.min(1, Math.max(0, value - index));
                  return (
                    <span key={index} className="h-2 flex-1 overflow-hidden rounded-sm bg-[#1b2838]/10">
                      <span className="block h-full bg-[#6d4fd1]" style={{ width: `${fill * 100}%` }} />
                    </span>
                  );
                })}
              </div>
              <div className="mt-1 text-[10px] text-[#9aa5b1]">{SKILL_HOW[key]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CareerTab() {
  const career = useGame((state) => state.career);
  const skills = useGame((state) => state.skills);
  const job = career ? jobsById[career.jobId] : undefined;
  if (!career || !job) {
    return (
      <div className="space-y-2 text-center">
        <div className="text-4xl">🧳</div>
        <p className="text-[12px] text-[#5c6b7a]">
          No job yet. Entry jobs need no skills, so pick one and start earning.
        </p>
        <button
          type="button"
          className="rounded-full bg-[#1b2838] px-4 py-2 text-[12px] font-bold text-white"
          onClick={() => useUi.getState().openPhone("jobs")}
        >
          Find a job
        </button>
      </div>
    );
  }
  const top = job.ladder.length - 1;
  const atTop = career.level >= top;
  const shiftsIn = career.shiftsDone % SHIFTS_PER_LEVEL;
  const pay = job.tips
    ? "Tips"
    : `${formatPence(Math.round(job.payPerHourPence * (1 + LEVEL_PAY_STEP * career.level)))}/hr`;
  return (
    <div className="space-y-2">
      <div className="rounded-3xl bg-gradient-to-br from-[#1b2838] to-[#2f4a6d] p-3 text-white">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{job.emoji}</span>
          <div className="flex-1">
            <div className="text-[10px] font-extrabold tracking-wide opacity-70">
              {job.name.toUpperCase()} · RANK {career.level + 1} OF {job.ladder.length}
            </div>
            <div className="text-base font-extrabold">{titleFor(job, career.level)}</div>
            <div className="text-[11px] opacity-80">
              {pay} · {job.hours}h shifts at {venuesById[job.venue]?.name}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1">
          {job.ladder.map((title, index) => (
            <div key={title} className="flex flex-1 flex-col items-center gap-1" title={title}>
              <span className={`h-2 w-full rounded-full ${index <= career.level ? "bg-[#3ccf6e]" : "bg-white/20"}`} />
              <span className="text-[10px]">{index === top ? "👑" : index === career.level ? "📍" : ""}</span>
            </div>
          ))}
        </div>
      </div>
      {atTop ? (
        <p className="rounded-2xl bg-[#fff4d6] p-3 text-[12px] font-semibold">
          Top of the ladder. Proper London success story.
        </p>
      ) : (
        <div className="rounded-2xl bg-[#f6f7f9] p-3">
          <div className="text-[11px] font-extrabold">Next: {titleFor(job, career.level + 1)}</div>
          <div className="mt-2 space-y-1 text-[11px]">
            <Check ok={false} label={`Shifts worked ${shiftsIn}/${SHIFTS_PER_LEVEL}`} />
            {job.skill ? (
              <Check
                ok={!jobLocked(job, skills)}
                label={`${capitalise(job.skill)} level ${job.skillRequired} (you're ${(skills[job.skill] ?? 0).toFixed(1)})`}
              />
            ) : null}
          </div>
          <Progress value={shiftsIn} max={SHIFTS_PER_LEVEL} tone="#3ccf6e" />
        </div>
      )}
      <button
        type="button"
        className="w-full rounded-full bg-[#1b2838] py-2 text-[12px] font-bold text-white"
        onClick={() => useUi.getState().openPhone("jobs")}
      >
        Open Jobs
      </button>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold text-white ${ok ? "bg-[#3ccf6e]" : "bg-[#c9ced4]"}`}
      >
        {ok ? "✓" : ""}
      </span>
      <span>{label}</span>
    </div>
  );
}

export function SimPanel() {
  const tab = useUi((state) => state.simPanel);
  const name = useGame((state) => state.name);
  const appearance = useGame((state) => state.appearance);
  const needs = useGame((state) => state.needs);
  const moodlets = useGame((state) => state.moodlets);
  const gameMinutes = useGame((state) => state.gameMinutes);
  const heatingOn = useGame((state) => state.heatingOn);
  if (!tab) return null;
  const band = moodBand(moodScore(needs, moodlets, gameMinutes, heatingOn));

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-40 grid place-items-center bg-[#0b1220]/40 p-3 backdrop-blur-sm"
      onClick={() => useUi.getState().openSimPanel(null)}
    >
      <section
        className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-[28px] bg-white text-[#1b2838] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center gap-3 p-3 pb-2">
          <span
            className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-white shadow"
            style={{
              background: `radial-gradient(circle at 50% 38%, ${appearance.skin} 0 38%, ${appearance.top} 39%)`,
            }}
          >
            <span className="absolute -bottom-1 -right-1 flex rounded-full bg-white p-0.5 shadow">
              <Flag origin={appearance.origin} />
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-extrabold">{name}</div>
            <div className="text-[11px] text-[#5c6b7a]">Feeling {band.toLowerCase()}</div>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full bg-[#f1f3f6] text-sm font-bold"
            onClick={() => useUi.getState().openSimPanel(null)}
          >
            ✕
          </button>
        </header>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                tab === entry.id ? "bg-[#1b2838] text-white" : "bg-[#f1f3f6]"
              }`}
              onClick={() => useUi.getState().openSimPanel(entry.id)}
            >
              <span>{entry.emoji}</span>
              {entry.label}
            </button>
          ))}
        </nav>
        <div className="overflow-y-auto px-3 pb-4">
          {tab === "profile" ? <Profile /> : null}
          {tab === "needs" ? <NeedsTab /> : null}
          {tab === "goals" ? <GoalsTab /> : null}
          {tab === "skills" ? <SkillsTab /> : null}
          {tab === "career" ? <CareerTab /> : null}
        </div>
      </section>
    </div>
  );
}
