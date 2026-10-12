import assert from "node:assert/strict";
import test from "node:test";
import { formatSpan, londonTime, timeAtOffset } from "./londonClock";

test("london time follows GMT in winter and BST in summer", () => {
  const winter = londonTime(Date.UTC(2026, 0, 14, 9, 5));
  assert.equal(winter.time, "09:05");
  assert.equal(winter.longWeekday, "Wednesday");
  assert.equal(winter.date, "14 Jan");
  const summer = londonTime(Date.UTC(2026, 6, 14, 9, 5));
  assert.equal(summer.time, "10:05");
});

test("time back home crosses midnight", () => {
  const lateLondon = Date.UTC(2026, 0, 14, 23, 30);
  const lagos = timeAtOffset(lateLondon, 1);
  assert.equal(lagos.hour, 0);
  assert.equal(lagos.dayDelta, 1);
  const kingston = timeAtOffset(Date.UTC(2026, 0, 14, 2, 0), -5);
  assert.equal(kingston.hour, 21);
  assert.equal(kingston.dayDelta, -1);
});

test("spans read naturally", () => {
  assert.equal(formatSpan(42), "42s");
  assert.equal(formatSpan(12 * 60), "12m");
  assert.equal(formatSpan(65 * 60), "1h 05m");
});
