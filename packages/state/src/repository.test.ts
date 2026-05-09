import { describe, expect, test } from "bun:test";

import { agentId, episodeId, runId } from "../../core/src/index.js";
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
});
