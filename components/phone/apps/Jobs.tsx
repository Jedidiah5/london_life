"use client";

import { useEffect, useState } from "react";
import { jobs, jobsById, venuesById } from "@/lib/content";
import { applyJob, finishShift, startShift } from "@/lib/net/rpc";
import { capitalise } from "@/lib/sim/actions";
import { jobLocked, titleFor } from "@/lib/sim/career";
import { SHIFTS_PER_LEVEL } from "@/lib/sim/constants";
import { formatPence } from "@/lib/sim/money";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";

export function Jobs() {
  const skills = useGame((state) => state.skills);
  const location = useGame((state) => state.location);
  const shift = useGame((state) => state.shift);
  const career = useGame((state) => state.career);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  const mine = career ? jobsById[career.jobId] : undefined;
  const remaining = shift ? shift.expectedSeconds - (now - Date.parse(shift.startedAt)) / 1000 : 0;
  const progress = shift ? Math.min(1, 1 - remaining / shift.expectedSeconds) : 0;

  return (
    <div className="space-y-2 text-xs">
      {mine && career ? (
        <div className="rounded-2xl bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{mine.emoji}</span>
            <div className="flex-1">
              <div className="text-[10px] font-bold text-[#9aa5b1]">YOUR JOB</div>
              <div className="text-sm font-bold">{titleFor(mine, career.level)}</div>
              <div className="text-[11px] text-[#5c6b7a]">
                {venuesById[mine.venue]?.emoji} {venuesById[mine.venue]?.name} · {mine.hours}h shifts
              </div>
            </div>
          </div>
          {career.level < mine.ladder.length - 1 ? (
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-[#5c6b7a]">
                <span>Next: {titleFor(mine, career.level + 1)}</span>
                <span>
                  {career.shiftsDone % SHIFTS_PER_LEVEL}/{SHIFTS_PER_LEVEL} shifts
                </span>
              </div>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-[#ece7de]">
                <div
                  className="h-full rounded-full bg-[#f5a524]"
                  style={{ width: `${((career.shiftsDone % SHIFTS_PER_LEVEL) / SHIFTS_PER_LEVEL) * 100}%` }}
                />
              </div>
            </div>
          ) : null}
          {shift ? (
            <div className="mt-2">
              <div className="h-2 overflow-hidden rounded-full bg-[#ece7de]">
                <div className="h-full rounded-full bg-[#3ccf6e]" style={{ width: `${progress * 100}%` }} />
              </div>
              <button
                type="button"
                disabled={remaining > 0 || busy}
                className="mt-2 w-full rounded-full bg-[#3ccf6e] py-2 text-[12px] font-bold text-white disabled:opacity-40"
                onClick={() => {
                  setBusy(true);
                  void finishShift().then((result) => {
                    setBusy(false);
                    if (typeof result === "string") {
                      useUi.getState().pushToast(result, "bad");
                      return;
                    }
                    useUi.getState().pushToast(`Paid ${result.wage}`, "good");
                    if (result.promoted) useUi.getState().pushToast(`Promoted to ${result.title}! 🎉`, "good");
                  });
                }}
              >
                {remaining > 0 ? `Working… ${Math.ceil(remaining)}s` : "Collect wages"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              className="mt-2 w-full rounded-full bg-[#1b2838] py-2 text-[12px] font-bold text-white"
              onClick={() => {
                if (location !== mine.venue) {
                  useUi.getState().setNav("map");
                  useUi.getState().setTravelTo(mine.venue);
                  useUi.getState().pushToast(`Head to ${venuesById[mine.venue]?.name} first`);
                  return;
                }
                setBusy(true);
                void startShift(mine.id).then((error) => {
                  setBusy(false);
                  if (error) useUi.getState().pushToast(error, "bad");
                  else useUi.getState().pushToast("Shift started. Look busy.", "good");
                });
              }}
            >
              {location === mine.venue ? "Start shift" : `Go to ${venuesById[mine.venue]?.name}`}
            </button>
          )}
        </div>
      ) : (
        <p className="rounded-2xl bg-[#fff4d6] p-2 text-[12px]">No job yet. Pick one below — entry jobs need no skills.</p>
      )}
      <p className="pt-1 text-[10px] font-bold text-[#9aa5b1]">JOB BOARD</p>
      {jobs.map((job) => {
        const locked = jobLocked(job, skills);
        const current = career?.jobId === job.id;
        return (
          <div key={job.id} className={`flex items-center gap-2 rounded-2xl bg-white p-2 shadow-sm ${locked ? "opacity-60" : ""}`}>
            <span className="text-xl">{job.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-bold">{job.name}</div>
              <div className="truncate text-[10px] text-[#5c6b7a]">
                {venuesById[job.venue]?.name} · {job.tips ? "tips" : `${formatPence(job.payPerHourPence)}/hr`} · {job.hours}h
              </div>
              {job.skill ? (
                <div className={`text-[10px] font-semibold ${locked ? "text-[#e5484d]" : "text-[#22924f]"}`}>
                  {locked ? "🔒 " : "✓ "}
                  {capitalise(job.skill)} {(skills[job.skill] ?? 0).toFixed(1)}/{job.skillRequired}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              disabled={locked || current || Boolean(shift) || busy}
              className="rounded-full bg-[#1b2838] px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-40"
              onClick={() => {
                setBusy(true);
                void applyJob(job.id).then((error) => {
                  setBusy(false);
                  if (error) useUi.getState().pushToast(error, "bad");
                  else useUi.getState().pushToast(`You're hired: ${titleFor(job, 0)}!`, "good");
                });
              }}
            >
              {current ? "Yours" : "Apply"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
