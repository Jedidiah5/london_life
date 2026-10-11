import assert from "node:assert/strict";
import test from "node:test";
import { findPath } from "./path";

test("returns an empty path when already there", () => {
  assert.deepEqual(findPath({ x: 1, y: 1 }, { x: 1, y: 1 }, new Set(), 5, 5), []);
});

test("walks around a blocked tile", () => {
  const path = findPath({ x: 0, y: 0 }, { x: 2, y: 0 }, new Set(["1,0"]), 5, 5);
  assert.ok(path);
  assert.deepEqual(path.at(-1), { x: 2, y: 0 });
  assert.equal(
    path.some((tile) => tile.x === 1 && tile.y === 0),
    false,
  );
});

test("fails when the goal is blocked or outside the room", () => {
  assert.equal(findPath({ x: 0, y: 0 }, { x: 1, y: 0 }, new Set(["1,0"]), 5, 5), null);
  assert.equal(findPath({ x: 0, y: 0 }, { x: 9, y: 0 }, new Set(), 5, 5), null);
});
