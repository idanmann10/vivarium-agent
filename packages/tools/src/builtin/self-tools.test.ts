import { describe, expect, test } from "bun:test";

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { agentId, episodeId, runId, skillId } from "../../../core/src/index.js";
import { InMemoryStateRepository, SQLiteStateRepository } from "../../../state/src/index.js";
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

  test("exposes roadmap self-tools against SQLite state", () => {
    const statePath = join(mkdtempSync(join(tmpdir(), "self-tools-state-")), "state.db");
    const state = new SQLiteStateRepository(statePath);
    const run = runId("run-self-tools-sqlite");
    const skill = skillId("coding.self-tools");
    const tools = createSelfTools({
      state,
      world: createLocalWorldReader({ root: "../the-world" }),
    });

    tools.runs.create({
      id: run,
      agentId: agentId("agent-tools"),
      domain: "coding",
      goal: "persist self tools",
      startedAt: "local",
      endedAt: null,
      success: true,
      score: 0.9,
      notes: "",
      publishable: false,
      published: false,
      publishedAt: null,
      visibility: "private",
    });
    state.upsertLocalSkill({
      id: skill,
      name: "SQLite Self Tools",
      domain: "coding",
      status: "promoted",
      uses: 0,
      helped: 0,
      lastUsedRunOffset: 0,
      habitual: false,
      body: "Use SQLite-backed self tools.",
    });

    const fact = tools.memory.write({ domain: "coding", subject: "Self tools", content: "SQLite tools persist." });
    expect(tools.memory.forget(fact.id)).toBe(true);
    const keptFact = tools.memory.write({ domain: "coding", subject: "Self tools", content: "SQLite tools remain." });
    tools.skills.use(skill, true);
    tools.antiPatterns.flag(skill, "The skill skipped evidence.", "coding");
    tools.traces.author(run, ["Started with persisted state."], "coding");
    state.close();

    const reopened = new SQLiteStateRepository(statePath);
    expect(reopened.listSemanticFacts("coding").map((item) => item.id)).toEqual([keptFact.id]);
    expect(reopened.listLocalSkills()[0]?.uses).toBe(1);
    expect(reopened.listLocalSkills()[0]?.helped).toBe(1);
    expect(reopened.listAntiPatternCandidates("coding")[0]?.evidenceRunIds).toEqual([String(run)]);
    expect(reopened.listTraceCandidates("coding")[0]?.steps[0]?.annotation).toBe("Started with persisted state.");
    reopened.close();
  });
});
