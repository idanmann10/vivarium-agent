import { describe, expect, test } from "bun:test";

import { skillId } from "../../core/src/index.js";
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

  test("loads anti-patterns into the plan before executing unfamiliar goals", async () => {
    const harness = createHarness();
    const result = await runGoal({
      goal: "edit implementation before reading surrounding code",
      domain: "coding",
      agentName: "local-agent",
      provider: harness.provider,
      tools: harness.tools,
    });

    const plan = harness.state.listEpisodes(result.runId).find((episode) => episode.kind === "plan");

    expect(result.success).toBe(true);
    expect(plan).toMatchObject({ kind: "plan" });
    expect(plan?.plan).toContain("Editing Before Reading");
  });

  test("preloads habitual local skills before retrieval-selected skills", async () => {
    const harness = createHarness();
    harness.state.upsertLocalSkill({
      id: skillId("coding.habitual-branch-cleanup"),
      name: "Habitual Branch Cleanup",
      domain: "coding",
      status: "promoted",
      uses: 42,
      helped: 40,
      lastUsedRunOffset: 0,
      habitual: true,
      body: "A frequently used local habit.",
    });

    const result = await runGoal({
      goal: "summarize the release notes",
      domain: "coding",
      agentName: "local-agent",
      provider: harness.provider,
      tools: harness.tools,
    });

    const plan = harness.state.listEpisodes(result.runId).find((episode) => episode.kind === "plan");

    expect(result.success).toBe(true);
    expect(plan?.plan).toContain("Habitual Branch Cleanup");
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

  test("queues anonymized publishable run artifacts when reflection allows publication", async () => {
    const harness = createHarness();
    const result = await runGoal({
      goal: "summarize idan@example.com with Bearer sk-secret-token",
      domain: "coding",
      agentName: "local-agent",
      provider: harness.provider,
      tools: harness.tools,
      surprises: ["unexpectedly reusable workflow"],
    });

    const run = harness.state.getRun(result.runId);
    const artifacts = harness.state.listPublishableArtifacts();

    expect(result.success).toBe(true);
    expect(run?.publishable).toBe(true);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0]).toMatchObject({ kind: "run", path: `runs/${String(result.runId)}` });
    expect(artifacts[0]?.body).toContain("[REDACTED_EMAIL]");
    expect(artifacts[0]?.body).toContain("Bearer [REDACTED_TOKEN]");
    expect(artifacts[0]?.body).not.toContain("idan@example.com");
    expect(artifacts[0]?.body).not.toContain("sk-secret-token");
  });
});
