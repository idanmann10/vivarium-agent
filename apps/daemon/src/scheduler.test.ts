import { describe, expect, test } from "bun:test";

import { shouldRunDream } from "./scheduler.js";

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
