import assert from "node:assert/strict";
import test from "node:test";
import { normaliseAppearance, randomAppearance } from "./appearance";
import { BOTTOMS, HAIRS, HEADWEAR_COLOURS, SHOES, SKINS, TOPS } from "./constants";

const palette = {
  skins: SKINS,
  hairs: HAIRS,
  tops: TOPS,
  bottoms: BOTTOMS,
  shoes: SHOES,
  headwearColours: HEADWEAR_COLOURS,
};

function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

test("random looks are always valid and keep the chosen origin", () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const look = randomAppearance({ origin: "jamaica", londonBorn: false }, palette, seeded(seed));
    assert.deepEqual(normaliseAppearance(look), look);
    assert.equal(look.origin, "jamaica");
    assert.equal(look.londonBorn, false);
    if (look.figure === "fem") assert.equal(look.beard, false);
    if (look.figure === "masc") assert.notEqual(look.topStyle, "dress");
  }
});

test("random looks vary", () => {
  const rng = seeded(7);
  const seen = new Set<string>();
  for (let i = 0; i < 30; i += 1) seen.add(JSON.stringify(randomAppearance({ origin: "england", londonBorn: true }, palette, rng)));
  assert.ok(seen.size > 20);
});
