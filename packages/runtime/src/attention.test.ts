import { describe, expect, test } from "bun:test";

import { agentId, episodeId, runId, type Episode } from "../../core/src/index.js";
import type { LocalWorldSearchResult } from "../../world/src/index.js";
import { applyAttentionLimits } from "./attention.js";

function episode(index: number): Episode {
  return {
    id: episodeId(`episode-${index}`),
    runId: runId("run-attention"),
    agentId: agentId("agent-attention"),
    timestamp: `2026-05-09T00:00:0${index}.000Z`,
    tags: [],
    kind: "observation",
    content: `observation-${index}`,
  };
}

function worldResult(kind: LocalWorldSearchResult["kind"], id: string, score: number): LocalWorldSearchResult {
  return {
    kind,
    id,
    title: id,
    path: `/world/${id}`,
    score,
  };
}

describe("applyAttentionLimits", () => {
  test("caps skills, traces, tools, and recent episodes", () => {
    const result = applyAttentionLimits({
      worldResults: [
        worldResult("skill", "skill-a", 3),
        worldResult("skill", "skill-b", 2),
        worldResult("trace", "trace-a", 3),
        worldResult("trace", "trace-b", 2),
        worldResult("anti-pattern", "anti-a", 10),
      ],
      tools: ["http.request", "file.read", "terminal.run"],
      episodes: [episode(1), episode(2), episode(3)],
      limits: {
        maxSkillsInContext: 1,
        maxToolsActive: 2,
        maxWorkingTokens: 100,
        maxEpisodesInContext: 2,
      },
    });

    expect(result.skills.map((skill) => skill.id)).toEqual(["skill-a"]);
    expect(result.traces.map((trace) => trace.id)).toEqual(["trace-a"]);
    expect(result.antiPatterns.map((antiPattern) => antiPattern.id)).toEqual(["anti-a"]);
    expect(result.tools).toEqual(["http.request", "file.read"]);
    expect(result.episodes.map((item) => item.id)).toEqual([episodeId("episode-2"), episodeId("episode-3")]);
  });
});
