import { describe, expect, test } from "bun:test";

import { agentId, episodeId, runId, skillId } from "../../../core/src/index.js";
import { InMemoryStateRepository } from "../repository.js";
import {
  applyWorkingMemoryBudget,
  createEpisodicMemory,
  createIdentityMemory,
  createProceduralMemory,
  createSemanticMemory,
} from "./index.js";

describe("state memory modules", () => {
  test("implement working, episodic, semantic, procedural, and identity memory", () => {
    const state = new InMemoryStateRepository();
    const run = runId("run-memory");
    const firstEpisode = {
      id: episodeId("episode-memory-1"),
      runId: run,
      agentId: agentId("agent-memory"),
      timestamp: "2026-05-10T00:00:00.000Z",
      tags: [],
      kind: "run_start" as const,
      goal: "exercise memory",
      domain: "coding",
    };
    const secondEpisode = {
      id: episodeId("episode-memory-2"),
      runId: run,
      agentId: agentId("agent-memory"),
      timestamp: "2026-05-10T00:01:00.000Z",
      tags: [],
      kind: "run_end" as const,
      success: true,
    };

    const working = applyWorkingMemoryBudget(
      { episodes: [firstEpisode, secondEpisode], selectedSkills: [], tokenEstimate: 10 },
      { maxWorkingTokens: 10, maxEpisodesInContext: 1 },
    );
    expect(working.episodes.map((episode) => episode.id)).toEqual([episodeId("episode-memory-2")]);
    expect(() =>
      applyWorkingMemoryBudget(
        { episodes: [], selectedSkills: [], tokenEstimate: 11 },
        { maxWorkingTokens: 10, maxEpisodesInContext: 1 },
      ),
    ).toThrow("working memory token estimate exceeds maxWorkingTokens");

    const episodic = createEpisodicMemory(state);
    episodic.append(firstEpisode);
    episodic.append(secondEpisode);
    expect(episodic.list(run).map((episode) => episode.kind)).toEqual(["run_start", "run_end"]);

    const semantic = createSemanticMemory(state);
    semantic.write({
      id: "fact-memory",
      domain: "coding",
      subject: "Memory",
      fact: "Working memory trims old episodes.",
      confidence: 0.9,
      derivedFromEpisodeIds: [String(firstEpisode.id)],
      updatedAt: "2026-05-10T00:02:00.000Z",
    });
    expect(semantic.recall("trims", 1).map((fact) => fact.id)).toEqual(["fact-memory"]);
    expect(semantic.forget("fact-memory")).toBe(true);
    expect(semantic.list("coding")).toEqual([]);

    const procedural = createProceduralMemory(state);
    const skill = skillId("coding.memory-skill");
    procedural.upsert({
      id: skill,
      name: "Memory Skill",
      domain: "coding",
      status: "promoted",
      uses: 0,
      helped: 0,
      lastUsedRunOffset: 0,
      habitual: false,
      body: "Use memory modules.",
    });
    procedural.recordUse(skill, true);
    expect(procedural.search("modules").map((item) => item.id)).toEqual([skill]);
    expect(procedural.list()[0]).toMatchObject({ uses: 1, helped: 1 });

    const identity = createIdentityMemory(state);
    identity.set({
      agentId: agentId("agent-memory"),
      name: "agent-memory",
      devStages: { coding: "newborn" },
      runsCompleted: 0,
      summary: "Memory-backed agent.",
      updatedAt: "2026-05-10T00:03:00.000Z",
    });
    expect(identity.summarize()).toBe("Memory-backed agent.");
  });
});
