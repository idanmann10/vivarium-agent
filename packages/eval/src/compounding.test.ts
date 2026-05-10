import { describe, expect, test } from "bun:test";

import { runCompoundingEvaluation, scoreCompoundingImprovement } from "./compounding.js";

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

describe("runCompoundingEvaluation", () => {
  test("aggregates before and after observations across synthetic benchmark cases", () => {
    const result = runCompoundingEvaluation({
      benchmarkName: "coding-mini",
      cases: [
        {
          id: "fix-regression",
          domain: "coding",
          before: { proceduralHits: 1, validationScore: 0.4 },
          after: { proceduralHits: 2, validationScore: 0.9 },
        },
        {
          id: "summarize-trace",
          domain: "summarization",
          before: { proceduralHits: 0, validationScore: 0.6 },
          after: { proceduralHits: 1, validationScore: 0.9 },
        },
      ],
    });

    expect(result.benchmarkName).toBe("coding-mini");
    expect(result.beforeProceduralHits).toBe(1);
    expect(result.afterProceduralHits).toBe(3);
    expect(result.beforeValidationScore).toBeCloseTo(0.5);
    expect(result.afterValidationScore).toBeCloseTo(0.9);
    expect(result.delta).toBeCloseTo(2.4);
    expect(result.improved).toBe(true);
    expect(result.cases).toHaveLength(2);
    expect(result.cases[0]).toMatchObject({
      id: "fix-regression",
      domain: "coding",
      before: { proceduralHits: 1, validationScore: 0.4 },
      after: { proceduralHits: 2, validationScore: 0.9 },
      improved: true,
    });
    expect(result.cases[0]?.delta).toBeCloseTo(1.5);
    expect(result.cases[1]?.delta).toBeCloseTo(1.3);
  });

  test("rejects empty benchmark case lists", () => {
    expect(() => runCompoundingEvaluation({ cases: [] })).toThrow("compounding benchmark requires at least one case");
  });
});
