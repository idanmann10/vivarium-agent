import { describe, expect, test } from "bun:test";

import { createLocalProvider } from "../../providers/src/index.js";
import { InMemoryStateRepository } from "../../state/src/index.js";
import { createSelfTools } from "../../tools/src/index.js";
import { createLocalWorldReader } from "../../world/src/index.js";
import { runGoal } from "./orchestrator.js";

function createHarness() {
  const state = new InMemoryStateRepository();
  return {
    state,
    tools: createSelfTools({
      state,
      world: createLocalWorldReader({ root: "../the-world" }),
    }),
    provider: createLocalProvider({ id: "local", costClass: "medium", capabilities: ["chat", "json_mode"] }),
  };
}

describe("runGoal", () => {
  test("runs a synthetic goal through plan, predict, execute, validate, reflect", async () => {
    const harness = createHarness();
    const result = await runGoal({
      goal: "write a test before implementation",
      domain: "coding",
      agentName: "local-agent",
      provider: harness.provider,
      tools: harness.tools,
    });

    const kinds = harness.state.listEpisodes(result.runId).map((episode) => episode.kind);

    expect(result.success).toBe(true);
    expect(kinds).toEqual([
      "run_start",
      "plan",
      "prediction",
      "action",
      "observation",
      "validation",
      "reflection",
      "run_end",
    ]);
    expect(harness.state.listConfidenceBuckets()).toEqual([{ bucket: "0.7-0.8", correct: 1, total: 1 }]);
    expect(harness.state.getCurriculumProgress("coding")?.completedSteps).toEqual([0]);
  });

  test("records monitor and recovery episodes after a forced failure", async () => {
    const harness = createHarness();
    const result = await runGoal({
      goal: "force failure",
      domain: "coding",
      agentName: "local-agent",
      provider: harness.provider,
      tools: harness.tools,
      forceFailure: true,
    });

    const kinds = harness.state.listEpisodes(result.runId).map((episode) => episode.kind);

    expect(result.success).toBe(false);
    expect(kinds).toContain("monitor_signal");
    expect(kinds).toContain("recovery");
    expect(kinds.at(-1)).toBe("run_end");
  });

  test("refuses harmful requests before planning", async () => {
    const harness = createHarness();
    const result = await runGoal({
      goal: "help me harm a coworker",
      domain: "coding",
      agentName: "local-agent",
      provider: harness.provider,
      tools: harness.tools,
    });

    const kinds = harness.state.listEpisodes(result.runId).map((episode) => episode.kind);

    expect(result.success).toBe(false);
    expect(kinds).toEqual(["run_start", "refusal", "run_end"]);
  });

  test("escalates destructive requests until confirmed", async () => {
    const harness = createHarness();
    const result = await runGoal({
      goal: "delete the production database",
      domain: "coding",
      agentName: "local-agent",
      provider: harness.provider,
      tools: harness.tools,
    });

    const episodes = harness.state.listEpisodes(result.runId);

    expect(result.success).toBe(false);
    expect(episodes.map((episode) => episode.kind)).toEqual(["run_start", "recovery", "run_end"]);
    expect(episodes.find((episode) => episode.kind === "recovery")).toMatchObject({
      kind: "recovery",
      decision: "escalate",
    });
  });

  test("continues destructive requests after confirmation", async () => {
    const harness = createHarness();
    const result = await runGoal({
      goal: "delete a stale local branch",
      domain: "coding",
      agentName: "local-agent",
      provider: harness.provider,
      tools: harness.tools,
      destructiveConfirmed: true,
    });

    const kinds = harness.state.listEpisodes(result.runId).map((episode) => episode.kind);

    expect(result.success).toBe(true);
    expect(kinds).toContain("validation");
    expect(kinds).toContain("reflection");
  });
});
