import test from "node:test";
import assert from "node:assert/strict";
import { createPlan, getPlan, getIdentity, saveResponse, live } from "../data.js";

test(
  "local demo persists, edits one response, and preserves unavailable responses",
  { skip: live ? "Live configuration uses the separate two-device acceptance check" : false },
  async () => {
    const storage = new Map();
    const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
      },
    });
    try {
      assert.equal(live, false, "This test is for the unconfigured demo copy");
      const plan = await createPlan({
        title: "Movie night",
        note: "",
        timezone: "America/New_York",
        slots: ["2026-09-09T18:00", "2026-09-09T19:00"],
      });
      assert.match(plan.id, /^local-/);
      assert.deepEqual(await getPlan(plan.id), plan);
      const first = await saveResponse(plan, "Taylor", [0]);
      const identity = getIdentity(plan.id);
      assert.ok(identity.token);
      assert.equal(first.people.length, 1);
      assert.equal("token" in first.people[0], false);
      const edited = await saveResponse(first, "Taylor", []);
      assert.equal(edited.people.length, 1);
      assert.deepEqual(edited.people[0].slots, []);
      assert.equal(edited.people[0].id, identity.id);
      assert.deepEqual(await getPlan(plan.id), edited);
      await assert.rejects(getPlan("local-missing"), /local demo plan/);
      await assert.rejects(getPlan("12345678-1234-4234-8234-123456789012"), /not connected/);
    } finally {
      if (previous) Object.defineProperty(globalThis, "localStorage", previous);
      else delete globalThis.localStorage;
    }
  },
);
