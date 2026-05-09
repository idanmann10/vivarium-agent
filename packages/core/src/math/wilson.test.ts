import { describe, expect, test } from "bun:test";

import { wilsonLowerBound } from "./wilson.js";

describe("wilsonLowerBound", () => {
  test("returns 0 with no observations", () => {
    expect(wilsonLowerBound({ helped: 0, uses: 0 })).toBe(0);
  });

  test("matches roadmap examples", () => {
    expect(wilsonLowerBound({ helped: 3, uses: 3 })).toBeCloseTo(0.4385, 4);
    expect(wilsonLowerBound({ helped: 100, uses: 120 })).toBeCloseTo(0.7565, 4);
  });
});
