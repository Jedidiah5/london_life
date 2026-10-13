import assert from "node:assert/strict";
import test from "node:test";
import { screenStep } from "./grid";
import { canPlace, clampOrigin, firstFreeSpot, placementProblem } from "./placement";

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

test("a bad spot says why", () => {
  const none = new Set<string>();
  assert.equal(placementProblem({ x: 1, y: 2 }, "wall", 0, none, 5, 5, null), "wall");
  assert.equal(placementProblem({ x: 4, y: 0 }, [2, 1], 0, none, 5, 5, null), "outside");
  assert.equal(placementProblem({ x: 1, y: 1 }, [1, 1], 0, new Set(["1,1"]), 5, 5, null), "taken");
  assert.equal(placementProblem({ x: 2, y: 2 }, [1, 1], 0, none, 5, 5, { x: 2, y: 2 }), "standing");
  assert.equal(placementProblem({ x: 0, y: 1 }, [5, 1], 0, none, 5, 5, { x: 2, y: 0 }), "boxed");
  assert.equal(placementProblem({ x: 0, y: 4 }, [5, 1], 0, none, 5, 5, { x: 2, y: 0 }), null);
});

test("moving keeps the whole item inside the room", () => {
  assert.deepEqual(clampOrigin({ x: 9, y: -2 }, [2, 1], 0, 5, 5), {
    x: 3,
    y: 0,
  });
  assert.deepEqual(clampOrigin({ x: 9, y: 3 }, [2, 1], 1, 5, 5), {
    x: 4,
    y: 3,
  });
  assert.deepEqual(clampOrigin({ x: 2, y: 3 }, "wall", 0, 5, 5), {
    x: 2,
    y: 0,
  });
});

test("screen diagonals map to one grid step for each camera turn", () => {
  assert.deepEqual(screenStep(1, 1, 0), { x: 0, y: -1 });
  assert.deepEqual(screenStep(-1, 1, 0), { x: -1, y: 0 });
  assert.deepEqual(screenStep(1, -1, 0), { x: 1, y: 0 });
  const turned = screenStep(1, 1, 1);
  assert.equal(Math.abs(turned.x) + Math.abs(turned.y), 1);
  assert.notDeepEqual(turned, { x: 0, y: -1 });
});
