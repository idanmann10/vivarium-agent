import { describe, expect, test } from "bun:test";

import { agentId, episodeId, runId } from "../../../core/src/index.js";
import { InMemoryStateRepository } from "../../../state/src/index.js";
import { createLocalWorldReader } from "../../../world/src/index.js";
import { createSelfTools } from "./self-tools.js";

describe("self-tools", () => {
  test("records episodes, searches world, and advances curriculum", () => {
    const state = new InMemoryStateRepository();
    const tools = createSelfTools({
      state,
      world: createLocalWorldReader({ root: "../the-world" }),
    });
    const id = runId("run-tools");

    tools.runs.create({
      id,
      agentId: agentId("agent-tools"),
      domain: "coding",
      goal: "test first",
      startedAt: "local",
      endedAt: null,
      success: null,
      score: null,
      notes: "",
      publishable: false,
      published: false,
      publishedAt: null,
      visibility: "private",
    });

    tools.episodes.append({
      id: episodeId("episode-tools"),
      runId: id,
      agentId: agentId("agent-tools"),
      timestamp: "local",
      tags: [],
      kind: "run_start",
      goal: "test first",
      domain: "coding",
    });
    tools.curriculum.advance("coding", 0);

    expect(tools.episodes.list(id)).toHaveLength(1);
    expect(tools.world.search({ domain: "coding", query: "test first" }).length).toBeGreaterThan(0);
    expect(state.getCurriculumProgress("coding")?.completedSteps).toEqual([0]);
  });
});
