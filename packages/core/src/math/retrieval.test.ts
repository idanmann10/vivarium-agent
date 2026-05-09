import { describe, expect, test } from "bun:test";

import { recencyScore, retrievalScore } from "./retrieval.js";

describe("retrieval scoring", () => {
  test("combines similarity, effective lower bound, recency, and domain match", () => {
    const score = retrievalScore({
      similarity: 0.8,
      effectiveLowerBound: 0.6,
      recency: 0.5,
      domainMatch: 1,
    });

    expect(score).toBeCloseTo(0.72);
  });

  test("decays recency over a 30 day tau", () => {
    expect(recencyScore({ ageDays: 0 })).toBe(1);
    expect(recencyScore({ ageDays: 30 })).toBeCloseTo(Math.E ** -1);
  });
});
