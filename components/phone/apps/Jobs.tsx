"use client";

import { useEffect, useState } from "react";
import { jobs, jobsById, venuesById } from "@/lib/content";
import { finishShift, startShift } from "@/lib/net/rpc";
import { formatPence } from "@/lib/sim/money";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";

export function Jobs() {
  const skills = useGame((state) => state.skills);
  const location = useGame((state) => state.location);
  const shift = useGame((state) => state.shift);
  const cloud = useGame((state) => state.cloud);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const active = shift ? jobsById[shift.jobId] : null;
  const remaining = shift ? shift.expectedSeconds - (now - Date.parse(shift.startedAt)) / 1000 : 0;

  return (
    <div className="space-y-2 text-xs">
      {active ? (
        <div className="rounded-xl bg-white p-2">
          <div className="font-semibold">{active.name}</div>
          <div>{remaining > 0 ? `${Math.ceil(remaining)}s left` : "Shift finished"}</div>
          <button
            type="button"
            className="mt-2 rounded-full bg-[#2f6b4f] px-3 py-1 text-white disabled:opacity-40"
            disabled={remaining > 0}
            onClick={() => {
              void finishShift().then((result) => {
                useUi.getState().pushToast(result && !result.startsWith("Shift") && result.startsWith("£") ? `Paid ${result}` : (result ?? "Paid"));
              });
            }}
          >
            Collect wages
          </button>
        </div>
      ) : null}
      {jobs.map((job) => {
        const skill = job.skill ? (skills[job.skill] ?? 0) : job.skillRequired;
        const locked = job.skill ? (skills[job.skill] ?? 0) < job.skillRequired : false;
        return (
          <div key={job.id} className="rounded-xl bg-white p-2">
            <div className="font-semibold">{job.name}</div>
            <div className="text-[11px] text-[#5c6b7a]">
              {venuesById[job.venue]?.name} · {job.tips ? "tips" : `${formatPence(job.payPerHourPence)}/hr`} · {job.hours}h
            </div>
            {job.skill ? (
              <div className="text-[11px]">
                {job.skill} {skill.toFixed(1)} / {job.skillRequired}
              </div>
            ) : null}
            <button
              type="button"
              disabled={locked || Boolean(shift)}
              className="mt-1 rounded-full bg-[#1b2838] px-3 py-1 text-[11px] text-[#f4efe6] disabled:opacity-40"
              onClick={() => {
                if (!cloud) {
                  useUi.getState().pushToast("Connect Supabase before you can get paid");
                  return;
                }
                if (location !== job.venue) {
                  useUi.getState().setTravelTo(job.venue);
                  useUi.getState().pushToast("Go there first");
                  return;
                }
                void startShift(job.id).then((error) => {
                  if (error) useUi.getState().pushToast(error);
                });
              }}
            >
              {locked ? "Locked" : "Start shift"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
