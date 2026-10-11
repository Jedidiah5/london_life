"use client";

import { useState } from "react";
import { createCharacter } from "@/lib/net/rpc";
import { ASPIRATIONS, BOTTOMS, HAIRS, SHOES, SKINS, TOPS, TRAITS } from "@/lib/sim/constants";
import type { Appearance } from "@/lib/sim/types";
import { useUi } from "@/lib/store/useUi";

export function CharacterCreator() {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [appearance, setAppearance] = useState<Appearance>({
    body: "a",
    skin: SKINS[1] ?? "#e0ac7a",
    hair: "short",
    hairColor: HAIRS[0] ?? "#1c1c1c",
    top: TOPS[0] ?? "#1f4b99",
    bottom: BOTTOMS[0] ?? "#243044",
    shoes: SHOES[0] ?? "#1a1a1a",
    style: "casual",
  });
  const [traits, setTraits] = useState<string[]>([]);
  const [aspiration, setAspiration] = useState("property_ladder");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggleTrait(trait: string) {
    setTraits((current) => {
      if (current.includes(trait)) return current.filter((entry) => entry !== trait);
      if (current.length >= 2) return current;
      return [...current, trait];
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 bg-[#f4efe6] px-4 py-6 text-[#1b2838]">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-[#c8102e]">LONDON LIFE</p>
        <h1 className="text-3xl font-semibold">You have £400 and a box room.</h1>
        <p className="mt-1 text-sm text-[#5c6b7a]">Zone 4. Rent on Sunday. It is already raining.</p>
      </div>
      <label className="text-sm">
        Username
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="mt-1 w-full rounded-xl border border-[#1b2838]/15 bg-white px-3 py-2"
          placeholder="mindthegap"
        />
      </label>
      <label className="text-sm">
        Name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 w-full rounded-xl border border-[#1b2838]/15 bg-white px-3 py-2"
          placeholder="Alex"
        />
      </label>
      <div className="flex gap-2">
        {(["a", "b"] as const).map((body) => (
          <button
            key={body}
            type="button"
            className={`rounded-full px-3 py-1 text-sm ${appearance.body === body ? "bg-[#1b2838] text-[#f4efe6]" : "bg-white"}`}
            onClick={() => setAppearance({ ...appearance, body })}
          >
            Body {body.toUpperCase()}
          </button>
        ))}
      </div>
      <Swatches label="Skin" values={SKINS} selected={appearance.skin} onPick={(skin) => setAppearance({ ...appearance, skin })} />
      <Swatches label="Hair" values={HAIRS} selected={appearance.hairColor} onPick={(hairColor) => setAppearance({ ...appearance, hairColor })} />
      <Swatches label="Top" values={TOPS} selected={appearance.top} onPick={(top) => setAppearance({ ...appearance, top })} />
      <Swatches label="Bottom" values={BOTTOMS} selected={appearance.bottom} onPick={(bottom) => setAppearance({ ...appearance, bottom })} />
      <Swatches label="Shoes" values={SHOES} selected={appearance.shoes} onPick={(shoes) => setAppearance({ ...appearance, shoes })} />
      <div>
        <p className="text-sm">Two traits</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {TRAITS.map((trait) => (
            <button
              key={trait}
              type="button"
              className={`rounded-full px-2 py-1 text-xs ${traits.includes(trait) ? "bg-[#c8102e] text-white" : "bg-white"}`}
              onClick={() => toggleTrait(trait)}
            >
              {trait}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-1">
        {ASPIRATIONS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`rounded-xl px-3 py-2 text-left text-sm ${aspiration === entry.id ? "bg-[#1b2838] text-[#f4efe6]" : "bg-white"}`}
            onClick={() => setAspiration(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm text-[#c8102e]">{error}</p> : null}
      <button
        type="button"
        disabled={busy}
        className="rounded-full bg-[#c8102e] py-3 text-sm font-semibold text-white disabled:opacity-50"
        onClick={() => {
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
          void createCharacter({
            username,
            name: name.trim(),
            appearance,
            traits,
            aspiration,
          }).then((message) => {
            setBusy(false);
            if (message) {
              setError(message);
              useUi.getState().pushToast(message);
            }
          });
        }}
      >
        {busy ? "Moving in…" : "Start the week"}
      </button>
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
      <p className="text-sm">{label}</p>
      <div className="mt-1 flex gap-2">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            aria-label={value}
            className={`h-7 w-7 rounded-full border-2 ${selected === value ? "border-[#1b2838]" : "border-transparent"}`}
            style={{ background: value }}
            onClick={() => onPick(value)}
          />
        ))}
      </div>
    </div>
  );
}
