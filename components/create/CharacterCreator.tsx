"use client";

import { Flag } from "@/components/Flag";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { nationalities, nationalitiesById } from "@/lib/content";
import { createCharacter } from "@/lib/net/rpc";
import { defaultAppearance } from "@/lib/sim/appearance";
import {
  ASPIRATIONS,
  BOTTOMS,
  BUILDS,
  HAIR_STYLES,
  HAIRS,
  HEADWEAR,
  HEADWEAR_COLOURS,
  SHOES,
  SKINS,
  TOP_STYLES,
  TOPS,
  TRAITS,
} from "@/lib/sim/constants";
import type { Anim, Appearance } from "@/lib/sim/types";
import { useUi } from "@/lib/store/useUi";

const AvatarPreview = dynamic(() => import("./AvatarPreview"), { ssr: false });

const HAIR_LABELS: Record<string, string> = {
  short: "Short",
  fade: "Fade",
  buzz: "Buzz",
  bald: "Bald",
  afro: "Afro",
  curly: "Curly",
  long: "Long",
  ponytail: "Ponytail",
  bun: "Bun",
  braids: "Braids",
  locs: "Locs",
  cornrows: "Cornrows",
};

const HEADWEAR_LABELS: Record<string, string> = {
  none: "None",
  hijab: "Hijab",
  turban: "Turban",
  headwrap: "Headwrap",
  cap: "Cap",
  beanie: "Beanie",
};

const TOP_LABELS: Record<string, string> = {
  tee: "T-shirt",
  hoodie: "Hoodie",
  jacket: "Jacket",
  blazer: "Blazer",
  dress: "Dress",
  kaftan: "Kaftan",
};

type Step = "origin" | "look" | "you";

export function CharacterCreator() {
  const [step, setStep] = useState<Step>("origin");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [look, setLook] = useState<Appearance>(defaultAppearance());
  const [traits, setTraits] = useState<string[]>([]);
  const [aspiration, setAspiration] = useState("property_ladder");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewAnim, setPreviewAnim] = useState<Anim>("stand");
  const nation = nationalitiesById[look.origin];
  const set = (patch: Partial<Appearance>) => setLook((current) => ({ ...current, ...patch }));
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return nationalities;
    return nationalities.filter(
      (entry) => entry.label.toLowerCase().includes(needle) || entry.demonym.toLowerCase().includes(needle),
    );
  }, [query]);

  function toggleTrait(trait: string) {
    setTraits((current) => {
      if (current.includes(trait)) return current.filter((entry) => entry !== trait);
      if (current.length >= 2) return current;
      return [...current, trait];
    });
  }

  function submit() {
    if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
      setError("Username must be 3-20 letters, numbers, or _");
      return;
    }
    if (name.trim().length < 1) {
      setError("Give them a name");
      return;
    }
    if (traits.length !== 2) {
      setError("Pick two traits");
      return;
    }
    setBusy(true);
    setError(null);
    void createCharacter({ username, name: name.trim(), appearance: look, traits, aspiration }).then((message) => {
      setBusy(false);
      if (message) {
        setError(message);
        useUi.getState().pushToast(message, "bad");
      }
    });
  }

  const story = nation
    ? look.londonBorn
      ? nation.id === "england"
        ? "Born and raised in London. You still can't afford it."
        : `Born in London to a ${nation.demonym} family. Your mum's cooking is still the best in the city.`
      : `Just landed from ${nation.label}. ${nation.greeting} London!`
    : "";

  return (
    <main className="min-h-dvh w-full bg-gradient-to-b from-[#c9d8e6] to-[#f4efe6] text-[#1b2838]">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3 px-4 py-5">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-[0.22em] text-[#c8102e]">LONDON LIFE</p>
            <h1 className="text-2xl font-bold leading-tight">
              {step === "origin" ? "Where are you from?" : step === "look" ? "How do you look?" : "Who are you?"}
            </h1>
          </div>
          <div className="flex gap-1">
            {(["origin", "look", "you"] as const).map((entry) => (
              <span key={entry} className={`h-2 w-6 rounded-full ${step === entry ? "bg-[#c8102e]" : "bg-white"}`} />
            ))}
          </div>
        </header>

        <div className="relative h-56 overflow-hidden rounded-3xl bg-white/60 shadow-inner">
          <AvatarPreview look={look} anim={previewAnim} />
          <div className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-sm font-semibold shadow">
            {nation ? <Flag origin={nation.id} /> : null} {name || "You"}
          </div>
          <div className="absolute bottom-3 right-3 flex gap-1">
            {(["stand", "dance", "eat"] as const).map((anim) => (
              <button
                key={anim}
                type="button"
                onClick={() => setPreviewAnim(anim)}
                className={`rounded-full px-2 py-1 text-xs shadow ${previewAnim === anim ? "bg-[#1b2838] text-white" : "bg-white"}`}
              >
                {anim === "stand" ? "🧍" : anim === "dance" ? "🕺" : "🍛"}
              </button>
            ))}
          </div>
          {story ? (
            <p className="absolute bottom-3 left-3 right-28 text-[11px] leading-snug text-[#3a4a5a]">{story}</p>
          ) : null}
        </div>

        {step === "origin" ? (
          <section className="flex flex-1 flex-col gap-3">
            <p className="text-sm text-[#5c6b7a]">
              London is everyone&apos;s city. Your roots change your greetings, your comfort food, and who you bump into.
            </p>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search countries"
              className="rounded-2xl border border-[#1b2838]/10 bg-white px-4 py-2.5 text-sm shadow-sm"
            />
            <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto pr-1">
              {matches.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => set({ origin: entry.id, londonBorn: entry.id === "england" ? true : look.londonBorn })}
                  className={`flex flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[11px] font-semibold shadow-sm ${
                    look.origin === entry.id ? "bg-[#1b2838] text-white" : "bg-white"
                  }`}
                >
                  <Flag origin={entry.id} size="md" />
                  {entry.label}
                </button>
              ))}
            </div>
            {nation && nation.id !== "england" ? (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { born: true, label: "Born in London", sub: "Second generation" },
                  { born: false, label: `Moved from ${nation.label}`, sub: "Fresh off the plane" },
                ].map((option) => (
                  <button
                    key={String(option.born)}
                    type="button"
                    onClick={() => set({ londonBorn: option.born })}
                    className={`rounded-2xl px-3 py-2 text-left shadow-sm ${look.londonBorn === option.born ? "bg-[#c8102e] text-white" : "bg-white"}`}
                  >
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className="block text-[11px] opacity-80">{option.sub}</span>
                  </button>
                ))}
              </div>
            ) : null}
            {nation ? (
              <div className="rounded-2xl bg-white p-3 text-[12px] shadow-sm">
                <p>
                  <b>Greeting:</b> {nation.greeting}
                </p>
                <p>
                  <b>Taste of home:</b> {nation.dishEmoji} {nation.dish}
                </p>
              </div>
            ) : null}
            <button
              type="button"
              className="mt-auto rounded-full bg-[#c8102e] py-3 text-sm font-bold text-white shadow-lg"
              onClick={() => setStep("look")}
            >
              Next: your look
            </button>
          </section>
        ) : null}

        {step === "look" ? (
          <section className="flex flex-1 flex-col gap-3">
            <Swatches label="Skin" values={SKINS} selected={look.skin} onPick={(skin) => set({ skin })} />
            <Chips
              label="Hair"
              values={HAIR_STYLES}
              labels={HAIR_LABELS}
              selected={look.hairStyle}
              onPick={(hairStyle) => set({ hairStyle })}
            />
            <Swatches label="Hair colour" values={HAIRS} selected={look.hairColor} onPick={(hairColor) => set({ hairColor })} />
            <Chips
              label="Headwear"
              values={HEADWEAR}
              labels={HEADWEAR_LABELS}
              selected={look.headwear}
              onPick={(headwear) => set({ headwear })}
            />
            {look.headwear !== "none" ? (
              <Swatches
                label="Headwear colour"
                values={HEADWEAR_COLOURS}
                selected={look.headwearColor}
                onPick={(headwearColor) => set({ headwearColor })}
              />
            ) : null}
            <div className="flex gap-2">
              <Chips
                label="Build"
                values={BUILDS}
                labels={{ slim: "Slim", regular: "Regular", broad: "Broad" }}
                selected={look.build}
                onPick={(build) => set({ build })}
              />
              <div>
                <p className="text-xs font-semibold text-[#5c6b7a]">Beard</p>
                <button
                  type="button"
                  onClick={() => set({ beard: !look.beard })}
                  className={`mt-1 rounded-full px-3 py-1 text-xs shadow-sm ${look.beard ? "bg-[#1b2838] text-white" : "bg-white"}`}
                >
                  {look.beard ? "Yes" : "No"}
                </button>
              </div>
            </div>
            <Chips label="Outfit" values={TOP_STYLES} labels={TOP_LABELS} selected={look.topStyle} onPick={(topStyle) => set({ topStyle })} />
            <Swatches label="Top" values={TOPS} selected={look.top} onPick={(top) => set({ top })} />
            <Swatches label="Bottoms" values={BOTTOMS} selected={look.bottom} onPick={(bottom) => set({ bottom })} />
            <Swatches label="Trainers" values={SHOES} selected={look.shoes} onPick={(shoes) => set({ shoes })} />
            <div className="mt-auto flex gap-2">
              <button type="button" className="rounded-full bg-white px-5 py-3 text-sm font-semibold shadow" onClick={() => setStep("origin")}>
                Back
              </button>
              <button
                type="button"
                className="flex-1 rounded-full bg-[#c8102e] py-3 text-sm font-bold text-white shadow-lg"
                onClick={() => setStep("you")}
              >
                Next: name and vibe
              </button>
            </div>
          </section>
        ) : null}

        {step === "you" ? (
          <section className="flex flex-1 flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold text-[#5c6b7a]">
                Name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-[#1b2838]/10 bg-white px-3 py-2 text-sm text-[#1b2838]"
                  placeholder="Alex"
                />
              </label>
              <label className="text-xs font-semibold text-[#5c6b7a]">
                Username
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-[#1b2838]/10 bg-white px-3 py-2 text-sm text-[#1b2838]"
                  placeholder="mindthegap"
                />
              </label>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#5c6b7a]">Two traits</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {TRAITS.map((trait) => (
                  <button
                    key={trait}
                    type="button"
                    className={`rounded-full px-3 py-1 text-xs shadow-sm ${traits.includes(trait) ? "bg-[#c8102e] text-white" : "bg-white"}`}
                    onClick={() => toggleTrait(trait)}
                  >
                    {trait}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#5c6b7a]">Dream</p>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                {ASPIRATIONS.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={`rounded-2xl px-3 py-2 text-left text-sm shadow-sm ${aspiration === entry.id ? "bg-[#1b2838] text-white" : "bg-white"}`}
                    onClick={() => setAspiration(entry.id)}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-white/80 p-3 text-[12px] text-[#3a4a5a] shadow-sm">
              You start with <b>£400</b> and a box room in Zone 4. Rent is <b>£180</b> a week. Check the Bank app for when it&apos;s due. It is already raining.
            </div>
            {error ? <p className="text-sm font-semibold text-[#c8102e]">{error}</p> : null}
            <div className="mt-auto flex gap-2">
              <button type="button" className="rounded-full bg-white px-5 py-3 text-sm font-semibold shadow" onClick={() => setStep("look")}>
                Back
              </button>
              <button
                type="button"
                disabled={busy}
                className="flex-1 rounded-full bg-[#c8102e] py-3 text-sm font-bold text-white shadow-lg disabled:opacity-50"
                onClick={submit}
              >
                {busy ? "Moving in…" : "Move to London"}
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Swatches({
  label,
  values,
  selected,
  onPick,
}: {
  label: string;
  values: readonly string[];
  selected: string;
  onPick: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#5c6b7a]">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`${label} ${value}`}
            className={`h-7 w-7 rounded-full border-2 shadow-sm ${selected === value ? "scale-110 border-[#1b2838]" : "border-white"}`}
            style={{ background: value }}
            onClick={() => onPick(value)}
          />
        ))}
      </div>
    </div>
  );
}

function Chips<T extends string>({
  label,
  values,
  labels,
  selected,
  onPick,
}: {
  label: string;
  values: readonly T[];
  labels: Record<string, string>;
  selected: T;
  onPick: (value: T) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#5c6b7a]">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            className={`rounded-full px-3 py-1 text-xs shadow-sm ${selected === value ? "bg-[#1b2838] text-white" : "bg-white"}`}
            onClick={() => onPick(value)}
          >
            {labels[value] ?? value}
          </button>
        ))}
      </div>
    </div>
  );
}
