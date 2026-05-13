import { describe, expect, test } from "bun:test";

import {
  renderIdentityHistoryCommandResult,
  renderIdentityStageCommandResult,
  renderIdentitySummaryCommandResult,
} from "./identity.js";

describe("identity commands", () => {
  test("renders identity summary as branded terminal output", () => {
    const output = renderIdentitySummaryCommandResult({
      summary: "Newborn local agent initialized for coding.",
    });

    expect(output).toContain("Vivarium Identity");
    expect(output).toContain("Summary: Newborn local agent initialized for coding.");
    expect(output.trim().startsWith("{")).toBe(false);
  });

  test("renders identity stage and history as terminal output", () => {
    const stage = renderIdentityStageCommandResult({ domain: "coding", stage: "newborn" });
    const history = renderIdentityHistoryCommandResult({
      history: [
        {
          runId: "run-1",
          domain: "coding",
          goal: "write a test",
          success: true,
          score: 0.8,
          notes: "validated",
        },
      ],
    });

    expect(stage).toContain("Domain: coding");
    expect(stage).toContain("Stage: newborn");
    expect(stage.trim().startsWith("{")).toBe(false);
    expect(history).toContain("History: 1");
    expect(history).toContain("run-1");
    expect(history).toContain("Success: yes");
    expect(history.trim().startsWith("{")).toBe(false);
  });
});
