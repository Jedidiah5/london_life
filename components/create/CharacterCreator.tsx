"use client";

import { Flag } from "@/components/Flag";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { sessionUsername } from "@/lib/net/auth";
import { validateUsername } from "@/lib/net/authRules";
import { nationalities, nationalitiesById } from "@/lib/content";
import { createCharacter } from "@/lib/net/rpc";
import { defaultAppearance, randomAppearance } from "@/lib/sim/appearance";
import {
  ASPIRATIONS,
  BOTTOMS,
  BUILDS,
  FIGURES,
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
import { ASPIRATION_INFO, CREATOR_STEPS, STARTING_KIT, TRAIT_INFO, type CreatorStep } from "@/lib/sim/creator";
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

const PALETTE = {
  skins: SKINS,
  hairs: HAIRS,
  tops: TOPS,
  bottoms: BOTTOMS,
  shoes: SHOES,
  headwearColours: HEADWEAR_COLOURS,
};

const NAME_MAX = 24;

function pickTraits(): string[] {
  const pool = [...TRAITS];
  const first = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
  const second = pool[Math.floor(Math.random() * pool.length)];
  return [first, second];
}

export function CharacterCreator() {
  const [stepIndex, setStepIndex] = useState(0);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [look, setLook] = useState<Appearance>(defaultAppearance());
  const [traits, setTraits] = useState<string[]>([]);
  const [aspiration, setAspiration] = useState("property_ladder");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewAnim, setPreviewAnim] = useState<Anim>("stand");
  const panelBody = useRef<HTMLDivElement>(null);

  const step: CreatorStep = CREATOR_STEPS[stepIndex].id;
  const nation = nationalitiesById[look.origin];
  const set = (patch: Partial<Appearance>) => setLook((current) => ({ ...current, ...patch }));

  // Signed-up players already picked a username, so start from that.
  useEffect(() => {
    let alive = true;
    void sessionUsername().then((chosen) => {
      if (alive && chosen) setUsername((current) => current || chosen);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Every step starts at the top of its panel.
  useEffect(() => {
    panelBody.current?.scrollTo({ top: 0 });
    setError(null);
  }, [stepIndex]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return nationalities;
    return nationalities.filter(
      (entry) => entry.label.toLowerCase().includes(needle) || entry.demonym.toLowerCase().includes(needle),
    );
  }, [query]);

  const identityProblem = validateUsername(username) ?? (name.trim().length < 1 ? "Give them a name" : null);

  /** Why the player can't move on yet, or null when they can. */
  function blocker(): string | null {
    if (step === "look") return identityProblem;
    if (step === "personality" && traits.length !== 2) return `Choose ${2 - traits.length} more`;
    return null;
  }

  const blocked = blocker();
  const last = stepIndex === CREATOR_STEPS.length - 1;
  const displayName = name.trim() || "You";

  function toggleTrait(trait: string) {
    setTraits((current) => {
      if (current.includes(trait)) return current.filter((entry) => entry !== trait);
      if (current.length >= 2) return [current[1], trait];
      return [...current, trait];
    });
  }

  function randomise() {
    if (step === "origin") {
      const entry = nationalities[Math.floor(Math.random() * nationalities.length)];
      set({ origin: entry.id, londonBorn: entry.id === "england" ? true : Math.random() < 0.5 });
    } else if (step === "look") {
      setLook((current) => randomAppearance({ origin: current.origin, londonBorn: current.londonBorn }, PALETTE));
    } else if (step === "personality") {
      setTraits(pickTraits());
    } else if (step === "dream") {
      setAspiration(ASPIRATIONS[Math.floor(Math.random() * ASPIRATIONS.length)].id);
    }
  }

  function next() {
    if (blocked) {
      if (step === "look") setError(identityProblem);
      return;
    }
    if (!last) setStepIndex((index) => index + 1);
  }

  function back() {
    setStepIndex((index) => Math.max(0, index - 1));
  }

  function submit() {
    if (identityProblem) {
      setError(identityProblem);
      setStepIndex(1);
      return;
    }
    if (traits.length !== 2) {
      setError("Pick two traits");
      setStepIndex(2);
      return;
    }
    setBusy(true);
    setError(null);
    void createCharacter({
      username: username.trim().replace(/^@/, ""),
      name: name.trim(),
      appearance: look,
      traits,
      aspiration,
    }).then((message) => {
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

  const primaryLabel = last
    ? busy
      ? "Moving in…"
      : "Move to London"
    : blocked ?? (step === "look" ? "Continue" : step === "origin" ? "Next: your look" : "Continue");

  return (
    <main className="relative flex h-dvh w-full flex-col overflow-hidden bg-gradient-to-b from-[#c9d8e6] via-[#e3e9ee] to-[#f4efe6] text-[#1b2838] md:flex-row">
      {/* Top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3">
        <button
          type="button"
          onClick={back}
          disabled={stepIndex === 0 || busy}
          aria-label="Back"
          className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-white text-lg shadow-md transition hover:bg-[#f4efe6] disabled:opacity-40"
        >
          ←
        </button>

        <div className="pointer-events-auto mt-0.5 flex flex-col items-center">
          <h1 className="text-lg font-extrabold leading-tight">{CREATOR_STEPS[stepIndex].title}</h1>
          <div className="mt-1 flex gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={CREATOR_STEPS.length} aria-valuenow={stepIndex + 1}>
            {CREATOR_STEPS.map((entry, index) => (
              <span
                key={entry.id}
                className={`h-1.5 w-7 rounded-full transition-colors ${index <= stepIndex ? "bg-[#c8102e]" : "bg-[#1b2838]/15"}`}
              />
            ))}
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {!last ? (
            <button
              type="button"
              onClick={randomise}
              aria-label="Randomise"
              title="Randomise"
              className="grid h-11 w-11 place-items-center rounded-full bg-white text-lg shadow-md transition hover:bg-[#f4efe6]"
            >
              🎲
            </button>
          ) : null}
          {!last ? (
            <button
              type="button"
              onClick={next}
              disabled={blocked !== null}
              className="h-11 rounded-full bg-[#c8102e] px-5 text-sm font-bold text-white shadow-md transition hover:bg-[#a90d26] disabled:bg-white disabled:text-[#9aa5b1]"
            >
              Next
            </button>
          ) : null}
        </div>
      </header>

      {/* Preview */}
      <section className="relative h-[40dvh] shrink-0 md:h-auto md:flex-1">
        <div className="absolute inset-0 pt-14">
          <AvatarPreview look={look} anim={previewAnim} />
        </div>
        <div className="absolute bottom-3 left-3 rounded-full bg-white px-3 py-1 text-sm font-semibold shadow">
          {nation ? <Flag origin={nation.id} /> : null} {displayName}
        </div>
        <p className="pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 text-xs font-semibold text-[#1b2838]/50 sm:block">
          Drag to spin
        </p>
        <div className="absolute bottom-3 right-3 flex gap-1">
          {(["stand", "dance", "eat"] as const).map((anim) => (
            <button
              key={anim}
              type="button"
              aria-label={`Preview: ${anim}`}
              onClick={() => setPreviewAnim(anim)}
              className={`rounded-full px-2.5 py-1 text-sm shadow ${previewAnim === anim ? "bg-[#1b2838] text-white" : "bg-white"}`}
            >
              {anim === "stand" ? "🧍" : anim === "dance" ? "🕺" : "🍛"}
            </button>
          ))}
        </div>
      </section>

      {/* Panel */}
      <section className="relative z-10 flex min-h-0 flex-1 flex-col rounded-t-[2rem] bg-white shadow-[0_-12px_40px_-20px_rgba(27,40,56,0.4)] md:m-3 md:mt-16 md:w-[460px] md:flex-none md:rounded-[2rem] md:shadow-xl">
        <div ref={panelBody} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-4 pt-5">
          {step === "origin" ? (
            <>
              <p className="text-sm text-[#5c6b7a]">
                London is everyone&apos;s city. Your roots change your greetings, your comfort food, and who you bump into.
              </p>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search countries"
                aria-label="Search countries"
                className="w-full rounded-full bg-[#f1ede6] px-4 py-3 text-sm outline-none focus:bg-white focus:ring-4 focus:ring-[#c8102e]/10"
              />
              <div className="grid grid-cols-3 gap-2">
                {matches.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => set({ origin: entry.id, londonBorn: entry.id === "england" ? true : look.londonBorn })}
                    className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-[11px] font-semibold transition ${
                      look.origin === entry.id ? "bg-[#1b2838] text-white" : "bg-[#f1ede6] hover:bg-[#e8e2d6]"
                    }`}
                  >
                    <Flag origin={entry.id} size="md" />
                    {entry.label}
                  </button>
                ))}
                {matches.length === 0 ? <p className="col-span-3 py-6 text-center text-sm text-[#5c6b7a]">No match. Try another spelling.</p> : null}
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
                      className={`rounded-2xl px-3 py-2.5 text-left transition ${look.londonBorn === option.born ? "bg-[#c8102e] text-white" : "bg-[#f1ede6] hover:bg-[#e8e2d6]"}`}
                    >
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className="block text-[11px] opacity-80">{option.sub}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              {nation ? (
                <div className="rounded-2xl bg-[#f4efe6] p-3.5 text-[13px] leading-relaxed">
                  <p>
                    <b>Greeting:</b> {nation.greeting}
                  </p>
                  <p>
                    <b>Taste of home:</b> {nation.dishEmoji} {nation.dish}
                  </p>
                  {story ? <p className="mt-1.5 text-[#5c6b7a]">{story}</p> : null}
                </div>
              ) : null}
            </>
          ) : null}

          {step === "look" ? (
            <>
              <div className="grid grid-cols-[1fr_1fr] gap-2">
                <label className="block">
                  <span className="text-xs font-semibold text-[#5c6b7a]">Name</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value.slice(0, NAME_MAX))}
                    placeholder="Alex"
                    autoComplete="off"
                    className="mt-1 w-full rounded-full bg-[#f1ede6] px-4 py-3 text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-[#c8102e]/10"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-[#5c6b7a]">Username</span>
                  <span className="relative mt-1 block">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#5c6b7a]">@</span>
                    <input
                      value={username}
                      onChange={(event) => setUsername(event.target.value.replace(/\s/g, "").slice(0, 21))}
                      placeholder="mindthegap"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="w-full rounded-full bg-[#f1ede6] py-3 pl-8 pr-4 text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-[#c8102e]/10"
                    />
                  </span>
                </label>
              </div>

              <Chips
                label="Body"
                values={FIGURES}
                labels={{ masc: "Masculine", fem: "Feminine" }}
                selected={look.figure}
                wide
                onPick={(figure) => set({ figure, beard: figure === "fem" ? false : look.beard })}
              />
              <Chips label="Hairstyle" values={HAIR_STYLES} labels={HAIR_LABELS} selected={look.hairStyle} onPick={(hairStyle) => set({ hairStyle })} />
              <Chips label="Headwear" values={HEADWEAR} labels={HEADWEAR_LABELS} selected={look.headwear} onPick={(headwear) => set({ headwear })} />
              <Chips label="Outfit" values={TOP_STYLES} labels={TOP_LABELS} selected={look.topStyle} onPick={(topStyle) => set({ topStyle })} />
              <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
                <Chips
                  label="Build"
                  values={BUILDS}
                  labels={{ slim: "Slim", regular: "Regular", broad: "Broad" }}
                  selected={look.build}
                  onPick={(build) => set({ build })}
                />
                {look.figure === "masc" ? (
                  <Chips
                    label="Beard"
                    values={["no", "yes"] as const}
                    labels={{ no: "No", yes: "Yes" }}
                    selected={look.beard ? "yes" : "no"}
                    onPick={(value) => set({ beard: value === "yes" })}
                  />
                ) : null}
              </div>
              <Swatches label="Skin tone" values={SKINS} selected={look.skin} onPick={(skin) => set({ skin })} />
              <Swatches label="Hair" values={HAIRS} selected={look.hairColor} onPick={(hairColor) => set({ hairColor })} />
              {look.headwear !== "none" ? (
                <Swatches label="Headwear colour" values={HEADWEAR_COLOURS} selected={look.headwearColor} onPick={(headwearColor) => set({ headwearColor })} />
              ) : null}
              <Swatches label="Outfit colour" values={TOPS} selected={look.top} onPick={(top) => set({ top })} />
              <Swatches label="Bottoms" values={BOTTOMS} selected={look.bottom} onPick={(bottom) => set({ bottom })} />
              <Swatches label="Trainers" values={SHOES} selected={look.shoes} onPick={(shoes) => set({ shoes })} />
            </>
          ) : null}

          {step === "personality" ? (
            <>
              <p className="text-sm text-[#5c6b7a]">
                Choose 2 traits for <b className="text-[#1b2838]">{displayName}</b>.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {TRAITS.map((trait) => {
                  const info = TRAIT_INFO[trait];
                  const on = traits.includes(trait);
                  return (
                    <button
                      key={trait}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleTrait(trait)}
                      className={`rounded-3xl border-2 p-3.5 text-left transition ${
                        on ? "border-[#c8102e] bg-[#c8102e]/[0.06]" : "border-transparent bg-[#f1ede6] hover:bg-[#e8e2d6]"
                      }`}
                    >
                      <span className="text-2xl">{info?.emoji ?? "✨"}</span>
                      <span className="mt-1 block text-[15px] font-bold">{trait}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-[#5c6b7a]">{info?.blurb}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {step === "dream" ? (
            <>
              <p className="text-sm text-[#5c6b7a]">
                What&apos;s <b className="text-[#1b2838]">{displayName}</b>&apos;s big dream?
              </p>
              <div className="space-y-2.5">
                {ASPIRATIONS.map((entry) => {
                  const info = ASPIRATION_INFO[entry.id];
                  const on = aspiration === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setAspiration(entry.id)}
                      className={`flex w-full items-center gap-4 rounded-3xl border-2 p-4 text-left transition ${
                        on ? "border-[#c8102e] bg-[#c8102e]/[0.06]" : "border-transparent bg-[#f1ede6] hover:bg-[#e8e2d6]"
                      }`}
                    >
                      <span className="text-3xl">{info?.emoji ?? "✨"}</span>
                      <span>
                        <span className="block text-base font-bold">{entry.label}</span>
                        <span className="block text-[13px] leading-snug text-[#5c6b7a]">{info?.blurb}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {step === "moving" ? (
            <>
              <p className="text-center text-sm text-[#5c6b7a]">
                Every Londoner starts somewhere. Here&apos;s where <b className="text-[#1b2838]">{displayName}</b> is starting.
              </p>
              <div className="rounded-[1.75rem] bg-gradient-to-br from-[#1b2838] to-[#2c4157] p-6 text-center text-[#f4efe6]">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/10 text-4xl">
                  {nation ? <Flag origin={nation.id} size="md" /> : "🏠"}
                </div>
                <p className="mt-3 text-2xl font-extrabold">{displayName}</p>
                <p className="text-sm text-[#f4efe6]/70">@{username.replace(/^@/, "")}</p>
                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  {traits.map((trait) => (
                    <span key={trait} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                      {TRAIT_INFO[trait]?.emoji} {trait}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-sm text-[#f4efe6]/80">
                  Dreaming of: <b>{ASPIRATIONS.find((entry) => entry.id === aspiration)?.label}</b>
                </p>
              </div>
              <ul className="space-y-2">
                {STARTING_KIT.map(([emoji, text]) => (
                  <li key={text} className="flex items-center gap-3 rounded-full bg-[#f1ede6] px-4 py-3 text-sm font-semibold">
                    <span>{emoji}</span>
                    {text}
                  </li>
                ))}
              </ul>
              <p className="px-2 text-center text-xs text-[#6b7a89]">Check the Bank app to see when rent is due. It is already raining.</p>
            </>
          ) : null}
        </div>

        <footer className="border-t border-[#1b2838]/5 p-4">
          {error ? (
            <p role="alert" className="mb-3 rounded-2xl bg-[#c8102e]/10 px-4 py-2.5 text-sm font-semibold text-[#a10d25]">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            disabled={busy || (!last && blocked !== null && step === "personality")}
            onClick={last ? submit : next}
            className="w-full rounded-full bg-[#c8102e] py-4 text-base font-extrabold text-white shadow-[0_10px_24px_-10px_rgba(200,16,46,0.75)] transition hover:bg-[#a90d26] disabled:cursor-not-allowed disabled:bg-[#c8102e]/35 disabled:shadow-none"
          >
            {primaryLabel}
          </button>
        </footer>
      </section>
    </main>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-[13px] font-semibold text-[#3d4c5c]">{children}</p>;
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
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2.5">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`${label} ${value}`}
            aria-pressed={selected === value}
            className={`h-9 w-9 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(27,40,56,0.15)] transition ${
              selected === value ? "scale-110 shadow-[0_0_0_3px_#c8102e]" : "hover:scale-105"
            }`}
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
  wide = false,
}: {
  label: string;
  values: readonly T[];
  labels: Record<string, string>;
  selected: T;
  onPick: (value: T) => void;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "w-full" : ""}>
      <Label>{label}</Label>
      <div className={wide ? "grid grid-cols-2 gap-2" : "flex flex-wrap gap-2"}>
        {values.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={selected === value}
            className={`rounded-full px-4 py-2 text-[13px] font-bold transition ${
              selected === value ? "bg-[#1b2838] text-white" : "bg-[#f1ede6] text-[#1b2838] hover:bg-[#e8e2d6]"
            }`}
            onClick={() => onPick(value)}
          >
            {labels[value] ?? value}
          </button>
        ))}
      </div>
    </div>
  );
}
