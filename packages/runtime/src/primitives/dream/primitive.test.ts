import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { agentId, episodeId, runId, skillId } from "../../../../core/src/index.js";
import { InMemoryStateRepository, SQLiteStateRepository } from "../../../../state/src/index.js";
import { runDream } from "./primitive.js";

describe("runDream", () => {
  test("promotes, prunes, habituates, updates identity, and summarizes confidence", () => {
    const state = new InMemoryStateRepository();
    state.setIdentity({
      agentId: agentId("agent-dream"),
      name: "agent-dream",
      devStages: { coding: "newborn" },
      runsCompleted: 0,
      summary: "Newborn local agent.",
      updatedAt: "local",
    });
    state.upsertLocalSkill({
      id: skillId("coding.candidate"),
      name: "Candidate Skill",
      domain: "coding",
      status: "candidate",
      uses: 5,
      helped: 5,
      lastUsedRunOffset: 0,
      habitual: false,
      body: "Useful candidate.",
    });
    state.upsertLocalSkill({
      id: skillId("coding.weak"),
      name: "Weak Skill",
      domain: "coding",
      status: "promoted",
      uses: 10,
      helped: 1,
      lastUsedRunOffset: 0,
      habitual: false,
      body: "Weak skill.",
    });
    state.upsertLocalSkill({
      id: skillId("coding.habit"),
      name: "Habit Skill",
      domain: "coding",
      status: "promoted",
      uses: 40,
      helped: 38,
      lastUsedRunOffset: 0,
      habitual: false,
      body: "Frequently useful.",
    });
    state.recordPredictionOutcome({ confidence: 0.76, correct: false });
    state.recordPredictionOutcome({ confidence: 0.72, correct: false });

    const result = runDream({
      state,
      domainStats: {
        coding: {
          runsCompleted: 10,
          successRate: 0.8,
          skillDiversity: 4,
        },
      },
    });

    expect(result.promoted).toContain("coding.candidate");
    expect(result.pruned).toContain("coding.weak");
    expect(result.habitual).toContain("coding.habit");
    expect(result.identitySummary).toContain("coding");
    expect(result.devStages.coding).toBe("journeyman");
    expect(result.confidenceNotes[0]).toContain("0.7-0.8");
    expect(state.listLocalSkills().find((skill) => String(skill.id) === "coding.candidate")?.status).toBe("promoted");
    expect(state.listLocalSkills().find((skill) => String(skill.id) === "coding.weak")?.status).toBe("archived");
  });

  test("generates anti-pattern and annotated trace candidates from run history", () => {
    const state = new InMemoryStateRepository();
    const failedRun = runId("run-dream-failed");
    const successfulRun = runId("run-dream-success");

    state.createRun({
      id: failedRun,
      agentId: agentId("agent-dream"),
      domain: "coding",
      goal: "retry without evidence",
      startedAt: "2026-05-09T00:00:00.000Z",
      endedAt: "2026-05-09T00:01:00.000Z",
      success: false,
      score: 0,
      notes: "Recovered from forced failure",
      publishable: false,
      published: false,
      publishedAt: null,
      visibility: "private",
    });
    state.appendEpisode({
      id: episodeId("failed-start"),
      runId: failedRun,
      agentId: agentId("agent-dream"),
      timestamp: "2026-05-09T00:00:00.000Z",
      tags: [],
      kind: "run_start",
      goal: "retry without evidence",
      domain: "coding",
    });
    state.appendEpisode({
      id: episodeId("failed-monitor"),
      runId: failedRun,
      agentId: agentId("agent-dream"),
      timestamp: "2026-05-09T00:00:30.000Z",
      tags: [],
      kind: "monitor_signal",
      offTrackScore: 0.9,
      reasons: ["forced failure"],
    });

    state.createRun({
      id: successfulRun,
      agentId: agentId("agent-dream"),
      domain: "coding",
      goal: "ship feature",
      startedAt: "2026-05-09T00:02:00.000Z",
      endedAt: "2026-05-09T00:04:00.000Z",
      success: true,
      score: 0.84,
      notes: "Completed local runtime slice",
      publishable: false,
      published: false,
      publishedAt: null,
      visibility: "private",
    });
    state.appendEpisode({
      id: episodeId("success-start"),
      runId: successfulRun,
      agentId: agentId("agent-dream"),
      timestamp: "2026-05-09T00:02:00.000Z",
      tags: [],
      kind: "run_start",
      goal: "ship feature",
      domain: "coding",
    });
    state.appendEpisode({
      id: episodeId("success-action"),
      runId: successfulRun,
      agentId: agentId("agent-dream"),
      timestamp: "2026-05-09T00:02:30.000Z",
      tags: [],
      kind: "action",
      tool: "local-provider.execute",
      args: { goal: "ship feature" },
    });
    state.appendEpisode({
      id: episodeId("success-observation"),
      runId: successfulRun,
      agentId: agentId("agent-dream"),
      timestamp: "2026-05-09T00:03:00.000Z",
      tags: [],
      kind: "observation",
      content: "implemented and verified",
    });
    state.appendEpisode({
      id: episodeId("success-validation"),
      runId: successfulRun,
      agentId: agentId("agent-dream"),
      timestamp: "2026-05-09T00:03:30.000Z",
      tags: [],
      kind: "validation",
      score: 0.84,
      passed: true,
      reasons: ["verified"],
    });

    const result = runDream({
      state,
      domainStats: {
        coding: {
          runsCompleted: 2,
          successRate: 0.5,
          skillDiversity: 1,
        },
      },
    });

    expect(result.antiPatternCandidates).toEqual(["anti-pattern-run-dream-failed"]);
    expect(result.traceCandidates).toEqual(["trace-run-dream-success"]);
    expect(state.listAntiPatternCandidates("coding")[0]).toMatchObject({
      id: "anti-pattern-run-dream-failed",
      evidenceRunIds: ["run-dream-failed"],
    });
    expect(state.listAntiPatternCandidates("coding")[0]?.why).toContain("forced failure");
    expect(state.listTraceCandidates("coding")[0]).toMatchObject({
      id: "trace-run-dream-success",
      sourceRunId: successfulRun,
      teaches: ["coding", "ship feature"],
    });
    expect(state.listTraceCandidates("coding")[0]?.steps.map((step) => step.annotation)).toContain(
      "Validation passed with score 0.84.",
    );
  });

  test("runs against SQLite-backed state repository", () => {
    const statePath = join(mkdtempSync(join(tmpdir(), "dream-sqlite-")), "state.db");
    const state = new SQLiteStateRepository(statePath);
    const failedRun = runId("run-dream-sqlite-failed");

    state.setIdentity({
      agentId: agentId("agent-dream-sqlite"),
      name: "agent-dream-sqlite",
      devStages: { coding: "newborn" },
      runsCompleted: 0,
      summary: "SQLite Dream agent.",
      updatedAt: "local",
    });
    state.createRun({
      id: failedRun,
      agentId: agentId("agent-dream-sqlite"),
      domain: "coding",
      goal: "recover from durable failure",
      startedAt: "2026-05-10T00:00:00.000Z",
      endedAt: "2026-05-10T00:01:00.000Z",
      success: false,
      score: 0,
      notes: "durable monitor signal",
      publishable: false,
      published: false,
      publishedAt: null,
      visibility: "private",
    });
    state.appendEpisode({
      id: episodeId("dream-sqlite-monitor"),
      runId: failedRun,
      agentId: agentId("agent-dream-sqlite"),
      timestamp: "2026-05-10T00:00:30.000Z",
      tags: [],
      kind: "monitor_signal",
      offTrackScore: 0.8,
      reasons: ["durable failure"],
    });

    const result = runDream({
      state,
      domainStats: { coding: { runsCompleted: 1, successRate: 0, skillDiversity: 0 } },
    });

    expect(result.antiPatternCandidates).toEqual(["anti-pattern-run-dream-sqlite-failed"]);
    expect(state.listAntiPatternCandidates("coding")[0]?.why).toContain("durable failure");
    state.close();
  });
});
