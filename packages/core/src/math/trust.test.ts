import { describe, expect, test } from "bun:test";

import { effectiveLowerBound, contributorTrust } from "./trust.js";

describe("trust weighting", () => {
  test("computes bounded trust from cumulative skill evidence", () => {
    const trust = contributorTrust([
      { lowerBound: 0.75, uses: 20 },
      { lowerBound: 0.5, uses: 4 },
    ]);

    expect(trust).toBeGreaterThan(0.5);
    expect(trust).toBeLessThan(1);
  });

  test("applies the roadmap's 0.85 to 1.0 uplift range", () => {
    expect(effectiveLowerBound({ lowerBound: 0.6, trust: 0 })).toBeCloseTo(0.51);
    expect(effectiveLowerBound({ lowerBound: 0.6, trust: 0.5 })).toBeCloseTo(0.555);
    expect(effectiveLowerBound({ lowerBound: 0.6, trust: 1 })).toBeCloseTo(0.6);
  });
});
