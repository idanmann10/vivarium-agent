import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

import { agentId, episodeId, runId, skillId } from "../../core/src/index.js";
import { SQLiteStateRepository } from "./sqlite-repository.js";

describe("SQLiteStateRepository", () => {
  test("persists all local state across repository instances", () => {
    const dbPath = join(mkdtempSync(join(tmpdir(), "agent-state-")), "state.db");
    const run = runId("run-sqlite");

    {
      const state = new SQLiteStateRepository(dbPath);
      state.createRun({
        id: run,
        agentId: agentId("agent-sqlite"),
        domain: "coding",
        goal: "persist state",
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
        id: episodeId("episode-sqlite"),
        runId: run,
        agentId: agentId("agent-sqlite"),
        timestamp: "2026-05-09T00:00:01.000Z",
        tags: ["sqlite"],
        kind: "run_start",
        goal: "persist state",
        domain: "coding",
      });
      state.recordPredictionOutcome({ confidence: 0.76, correct: true });
      state.advanceCurriculum("coding", 2);
      state.upsertLocalSkill({
        id: skillId("coding.sqlite"),
        name: "SQLite Skill",
        domain: "coding",
        status: "promoted",
        uses: 7,
        helped: 6,
        lastUsedRunOffset: 0,
        habitual: false,
        body: "Persist state.",
      });
      state.setIdentity({
        agentId: agentId("agent-sqlite"),
        name: "agent-sqlite",
        devStages: { coding: "apprentice" },
        runsCompleted: 1,
        summary: "SQLite-backed local agent.",
        updatedAt: "2026-05-09T00:00:02.000Z",
      });
      state.queuePublishableArtifact({ kind: "run", path: "runs/run-sqlite", body: "redacted" });
      state.close();
    }

    {
      const state = new SQLiteStateRepository(dbPath);

      expect(state.getRun(run)?.goal).toBe("persist state");
      expect(state.listEpisodes(run).map((episode) => episode.kind)).toEqual(["run_start"]);
      expect(state.listConfidenceBuckets()).toEqual([{ bucket: "0.7-0.8", correct: 1, total: 1 }]);
      expect(state.getCurriculumProgress("coding")?.completedSteps).toEqual([2]);
      expect(state.listLocalSkills()[0]?.name).toBe("SQLite Skill");
      expect(state.getIdentity()?.summary).toBe("SQLite-backed local agent.");
      expect(state.listPublishableArtifacts()).toEqual([{ kind: "run", path: "runs/run-sqlite", body: "redacted" }]);
      state.close();
    }
  });
});
