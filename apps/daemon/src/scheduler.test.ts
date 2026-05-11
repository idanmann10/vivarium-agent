import { describe, expect, test } from "bun:test";

import { createDreamScheduler, shouldRunDream } from "./scheduler.js";

describe("shouldRunDream", () => {
  test("runs after the configured hour when no prior run exists", () => {
    expect(shouldRunDream({ now: new Date("2026-05-09T03:00:00.000Z"), lastRunAt: null })).toBe(true);
  });

  test("does not rerun before a day elapses", () => {
    expect(
      shouldRunDream({
        now: new Date("2026-05-09T04:00:00.000Z"),
        lastRunAt: new Date("2026-05-09T03:00:00.000Z"),
      }),
    ).toBe(false);
  });
});

describe("createDreamScheduler", () => {
  test("runs Dream when the scheduled window is due and records scheduler status", () => {
    const runs: string[] = [];
    const scheduler = createDreamScheduler({
      dream(domainStats) {
        runs.push(Object.keys(domainStats).join(","));
        return {
          promoted: [],
          pruned: [],
          habitual: [],
          identitySummary: "Dream consolidated local state.",
          devStages: { coding: "newborn" },
          confidenceNotes: [],
          skillCandidates: [],
          antiPatternCandidates: [],
          traceCandidates: [],
        };
      },
      getDomainStats() {
        return { coding: { runsCompleted: 1, successRate: 1, skillDiversity: 1 } };
      },
      now: () => new Date("2026-05-09T03:00:00.000Z"),
    });

    const result = scheduler.tick();
    const skipped = scheduler.tick();

    expect(result?.identitySummary).toContain("Dream consolidated");
    expect(skipped).toBeNull();
    expect(runs).toEqual(["coding"]);
    expect(scheduler.status()).toEqual({
      running: false,
      lastRunAt: "2026-05-09T03:00:00.000Z",
      runs: 1,
    });
  });

  test("starts and stops a recurring Dream loop with injected timers", () => {
    let callback: (() => void) | undefined;
    const cleared: unknown[] = [];
    const scheduler = createDreamScheduler({
      dream() {
        return {
          promoted: [],
          pruned: [],
          habitual: [],
          identitySummary: "Dream consolidated local state.",
          devStages: {},
          confidenceNotes: [],
          skillCandidates: [],
          antiPatternCandidates: [],
          traceCandidates: [],
        };
      },
      getDomainStats() {
        return {};
      },
      now: () => new Date("2026-05-09T03:00:00.000Z"),
      intervalMs: 10,
      setInterval(fn, intervalMs) {
        expect(intervalMs).toBe(10);
        callback = fn;
        return "timer-handle";
      },
      clearInterval(handle) {
        cleared.push(handle);
      },
    });

    scheduler.start();
    if (callback === undefined) {
      throw new Error("Scheduler did not register interval callback");
    }
    callback();
    scheduler.stop();

    expect(scheduler.status()).toMatchObject({ running: false, runs: 1 });
    expect(cleared).toEqual(["timer-handle"]);
  });
});
