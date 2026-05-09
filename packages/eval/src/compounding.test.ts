import { describe, expect, test } from "bun:test";

import { scoreCompoundingImprovement } from "./compounding.js";

describe("scoreCompoundingImprovement", () => {
  test("reports improvement when post-dream procedural memory increases", () => {
    expect(
      scoreCompoundingImprovement({
        beforeProceduralHits: 1,
        afterProceduralHits: 3,
        beforeValidationScore: 0.6,
        afterValidationScore: 0.8,
      }),
    ).toEqual({ improved: true, delta: 2.2 });
  });
});
