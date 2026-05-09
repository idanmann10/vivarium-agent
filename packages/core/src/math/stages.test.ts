import { describe, expect, test } from "bun:test";

import { developmentScore, stageForScore } from "./stages.js";

describe("development stages", () => {
  test("computes roadmap score from runs, success rate, and diversity", () => {
    expect(
      developmentScore({
        runsCompleted: 10,
        successRate: 0.5,
        skillDiversity: 3,
      }),
    ).toBe(15);
  });

  test("maps thresholds to stages", () => {
    expect(stageForScore(4.99)).toBe("newborn");
    expect(stageForScore(5)).toBe("apprentice");
    expect(stageForScore(25)).toBe("journeyman");
    expect(stageForScore(100)).toBe("senior");
    expect(stageForScore(400)).toBe("master");
  });
});
