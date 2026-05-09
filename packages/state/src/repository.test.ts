import { describe, expect, test } from "bun:test";

import { agentId, episodeId, runId, skillId } from "../../core/src/index.js";
import { InMemoryStateRepository } from "./repository.js";

describe("InMemoryStateRepository", () => {
  test("stores runs and appends episodes in order", () => {
    const state = new InMemoryStateRepository();
    const id = runId("run-1");

    state.createRun({
      id,
      agentId: agentId("agent-1"),
      domain: "coding",
      goal: "write a test",
      startedAt: "2026-05-09T00:00:00.000Z",
      endedAt: null,
      success: null,
      score: null,
      notes: "",
      publishable: false,
      published: false,
      publishedAt: null,
      visibility: "private",
    });

    state.appendEpisode({
      id: episodeId("episode-1"),
      runId: id,
      agentId: agentId("agent-1"),
      timestamp: "2026-05-09T00:00:01.000Z",
      tags: [],
      kind: "run_start",
      goal: "write a test",
      domain: "coding",
    });

    state.appendEpisode({
      id: episodeId("episode-2"),
      runId: id,
      agentId: agentId("agent-1"),
      timestamp: "2026-05-09T00:00:02.000Z",
      tags: [],
      kind: "run_end",
      success: true,
    });

    expect(state.getRun(id)?.goal).toBe("write a test");
    expect(state.listEpisodes(id).map((episode) => episode.kind)).toEqual(["run_start", "run_end"]);
  });

  test("updates confidence buckets by prediction decile", () => {
    const state = new InMemoryStateRepository();

    state.recordPredictionOutcome({ confidence: 0.76, correct: false });
    state.recordPredictionOutcome({ confidence: 0.71, correct: true });

    expect(state.listConfidenceBuckets()).toEqual([
      { bucket: "0.7-0.8", correct: 1, total: 2 },
    ]);
  });

  test("advances curriculum progress once per step", () => {
    const state = new InMemoryStateRepository();

    state.advanceCurriculum("coding", 0);
    state.advanceCurriculum("coding", 1);
    state.advanceCurriculum("coding", 1);

    expect(state.getCurriculumProgress("coding")).toEqual({
      domain: "coding",
      currentStepIndex: 1,
      completedSteps: [0, 1],
      startedAt: "local",
    });
  });

  test("stores local skills, identity, and publishable artifacts", () => {
    const state = new InMemoryStateRepository();

    state.upsertLocalSkill({
      id: skillId("coding.red-green-refactor"),
      name: "Red Green Refactor",
      domain: "coding",
      status: "candidate",
      uses: 3,
      helped: 3,
      lastUsedRunOffset: 0,
      habitual: false,
      body: "Write a failing test first.",
    });
    state.setIdentity({
      agentId: agentId("agent-1"),
      name: "agent-1",
      devStages: { coding: "newborn" },
      runsCompleted: 0,
      summary: "Newborn local agent.",
      updatedAt: "local",
    });
    state.queuePublishableArtifact({ kind: "run", path: "runs/local", body: "redacted" });

    expect(state.listLocalSkills()).toHaveLength(1);
    expect(state.getIdentity()?.summary).toContain("Newborn");
    expect(state.listPublishableArtifacts()).toEqual([{ kind: "run", path: "runs/local", body: "redacted" }]);
  });

  test("upserts semantic facts and filters by domain", () => {
    const state = new InMemoryStateRepository();

    state.upsertSemanticFact({
      id: "fact-api-rate-limit",
      domain: "coding",
      subject: "GitHub API",
      fact: "Search requests can be rate limited.",
      confidence: 0.8,
      derivedFromEpisodeIds: ["episode-1"],
      updatedAt: "2026-05-09T00:00:00.000Z",
    });
    state.upsertSemanticFact({
      id: "fact-summary-tone",
      domain: "summarization",
      subject: "Executive summaries",
      fact: "Lead with the decision.",
      confidence: 0.7,
      derivedFromEpisodeIds: ["episode-2"],
      updatedAt: "2026-05-09T00:00:00.000Z",
    });
    state.upsertSemanticFact({
      id: "fact-api-rate-limit",
      domain: "coding",
      subject: "GitHub API",
      fact: "Search requests can return 403 when rate limited.",
      confidence: 0.9,
      derivedFromEpisodeIds: ["episode-1", "episode-3"],
      updatedAt: "2026-05-09T00:00:01.000Z",
    });

    expect(state.listSemanticFacts("coding")).toEqual([
      {
        id: "fact-api-rate-limit",
        domain: "coding",
        subject: "GitHub API",
        fact: "Search requests can return 403 when rate limited.",
        confidence: 0.9,
        derivedFromEpisodeIds: ["episode-1", "episode-3"],
        updatedAt: "2026-05-09T00:00:01.000Z",
      },
    ]);
    expect(state.listSemanticFacts()).toHaveLength(2);
  });
});
