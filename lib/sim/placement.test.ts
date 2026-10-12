import assert from "node:assert/strict";
import test from "node:test";
import { canPlace, firstFreeSpot } from "./placement";

test("items cannot overlap blocked tiles or leave the room", () => {
  const blocked = new Set(["2,2"]);
  assert.equal(canPlace({ x: 1, y: 2 }, [2, 1], 0, blocked, 5, 5), false);
  assert.equal(canPlace({ x: 1, y: 2 }, [2, 1], 1, blocked, 5, 5), true);
  assert.equal(canPlace({ x: 4, y: 0 }, [2, 1], 0, new Set(), 5, 5), false);
});

test("a new item drops onto the free spot nearest the middle", () => {
  assert.deepEqual(firstFreeSpot([1, 1], 0, new Set(), 5, 5), { x: 2, y: 2 });
  const spot = firstFreeSpot([1, 1], 0, new Set(["2,2"]), 5, 5);
  assert.ok(spot && !(spot.x === 2 && spot.y === 2));
  const everything = new Set(Array.from({ length: 25 }, (_, i) => `${i % 5},${Math.floor(i / 5)}`));
  assert.equal(firstFreeSpot([1, 1], 0, everything, 5, 5), null);
});
