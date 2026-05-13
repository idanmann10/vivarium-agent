import { describe, expect, test } from "bun:test";

import { renderDreamCommandResult } from "./dream.js";

describe("dream commands", () => {
  test("renders dream consolidation as branded terminal output", () => {
    const output = renderDreamCommandResult({
      promoted: ["coding.tdd"],
      pruned: [],
      habitual: ["coding.review"],
      identitySummary: "Dream consolidated 2 local skills across coding.",
      devStages: { coding: "apprentice" },
      confidenceNotes: ["Confidence bucket 0.7 is calibrated enough (8/10 correct)."],
      skillCandidates: ["coding.provider-smoke"],
      antiPatternCandidates: ["anti-pattern-run-1"],
      traceCandidates: ["trace-run-2"],
    });

    expect(output).toContain("Vivarium Dream");
    expect(output).toContain("Promoted: 1");
    expect(output).toContain("Habitual: 1");
    expect(output).toContain("Dream consolidated 2 local skills across coding.");
    expect(output).toContain("coding: apprentice");
    expect(output.trim().startsWith("{")).toBe(false);
  });
});
