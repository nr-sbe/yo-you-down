import test from "node:test";
import assert from "node:assert/strict";
import { buildSlots, rankSlots, addDays, hourLabel, escapeHtml, zoneLabel } from "../domain.js";
test("date ranges cross months and leap years without local timezone drift", () => {
  assert.deepEqual(buildSlots("2028-02-28", 3, 18, 19), [
    "2028-02-28T18:00",
    "2028-02-29T18:00",
    "2028-03-01T18:00",
  ]);
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});
test("reject invalid dates, inverted hours and oversized grids", () => {
  for (const args of [
    ["2026-02-30", 2, 18, 20],
    ["invalid", 2, 18, 20],
    ["2026-09-09", 8, 18, 20],
    ["2026-09-09", 2, 22, 18],
    ["2026-09-09", 1, -1, 24],
    ["2026-09-09", 1, 1, 25],
  ])
    assert.throws(() => buildSlots(...args));
  assert.equal(buildSlots("2026-09-09", 7, 0, 24).length, 168);
});
test("rank by overlap, ties chronologically; empty responses do not inflate matches", () => {
  const plan = {
    slots: ["a", "b", "c"],
    people: [
      { id: 1, slots: [0, 1] },
      { id: 2, slots: [1, 2] },
      { id: 3, slots: [] },
    ],
  };
  assert.deepEqual(
    rankSlots(plan).map((x) => [x.index, x.people.length]),
    [
      [1, 2],
      [0, 1],
      [2, 1],
    ],
  );
  assert.deepEqual(rankSlots({ ...plan, people: [] }), []);
});
test("midnight, noon and untrusted display text", () => {
  assert.equal(hourLabel(24), "12 AM");
  assert.equal(hourLabel(12), "12 PM");
  assert.equal(
    escapeHtml('<img src=x onerror="alert(1)">'),
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
  );
});

test("time zone labels retain the unambiguous IANA identifier", () => {
  assert.match(zoneLabel("America/New_York"), /America\/New_York/);
  assert.match(zoneLabel("America/Los_Angeles"), /America\/Los_Angeles/);
  assert.match(zoneLabel("Asia/Kathmandu"), /Asia\/Kathmandu/);
});
