import { describe, expect, test } from "bun:test";

import { agentId, episodeId, runId, type Episode } from "../../core/src/index.js";
import type { LocalWorldSearchResult } from "../../world/src/index.js";
import { applyAttentionLimits } from "./attention.js";

function episode(index: number, content = `observation-${index}`): Extract<Episode, { readonly kind: "observation" }> {
  return {
    id: episodeId(`episode-${index}`),
    runId: runId("run-attention"),
    agentId: agentId("agent-attention"),
    timestamp: `2026-05-09T00:00:0${index}.000Z`,
    tags: [],
    kind: "observation",
    content,
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
        worldResult("run", "run-a", 4),
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
    expect(result.runs.map((run) => run.id)).toEqual(["run-a"]);
    expect(result.tools).toEqual(["http.request", "file.read"]);
    expect(result.episodes.map((item) => item.id)).toEqual([episodeId("episode-2"), episodeId("episode-3")]);
  });

  test("accounts for and enforces the working token budget", () => {
    const result = applyAttentionLimits({
      worldResults: [
        worldResult("skill", "skill-a", 3),
        worldResult("trace", "trace-a", 2),
        worldResult("anti-pattern", "anti-a", 1),
      ],
      tools: ["http.request", "file.read"],
      episodes: [
        episode(1, "short observation"),
        episode(2, "x".repeat(600)),
        episode(3, "y".repeat(600)),
      ],
      limits: {
        maxSkillsInContext: 3,
        maxToolsActive: 2,
        maxWorkingTokens: 80,
        maxEpisodesInContext: 3,
      },
    });

    expect(result.tokenBudget.maxWorkingTokens).toBe(80);
    expect(result.tokenBudget.estimatedTokens).toBeLessThanOrEqual(80);
    expect(result.tokenBudget.truncated).toBe(true);
    expect(result.episodes.length).toBeLessThan(3);
  });
});
