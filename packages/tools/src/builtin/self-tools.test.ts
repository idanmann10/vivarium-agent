import { describe, expect, test } from "bun:test";

import { mkdtempSync, readFileSync } from "node:fs";
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

  test("persists world subscriptions through self-tools", () => {
    const root = mkdtempSync(join(tmpdir(), "self-tools-worlds-"));
    const subscriptionsPath = join(root, "subscriptions.json");
    const state = new InMemoryStateRepository();
    const tools = createSelfTools({
      state,
      world: createLocalWorldReader({ root: "../the-world" }),
      worldSubscriptionsPath: subscriptionsPath,
    });

    expect(tools.world.listSubscriptions()).toEqual([]);

    const result = tools.world.subscribe({
      label: "canonical",
      root: "../the-world",
      priority: 0,
      ref: "main",
      autoPushEnabled: false,
    });

    expect(result.subscriptions).toEqual([
      { label: "canonical", root: "../the-world", priority: 0, ref: "main", autoPushEnabled: false },
    ]);
    expect(tools.world.listSubscriptions()).toEqual(result.subscriptions);
    expect(tools.world.search({ domain: "coding", query: "test first" }).length).toBeGreaterThan(0);
  });

  test("proposes skills through subscribed worlds", () => {
    const root = mkdtempSync(join(tmpdir(), "self-tools-world-propose-"));
    const canonicalWorld = join(root, "canonical");
    const privateWorld = join(root, "private");
    const subscriptionsPath = join(root, "subscriptions.json");
    const state = new InMemoryStateRepository();
    const tools = createSelfTools({
      state,
      world: createLocalWorldReader({ root: "../the-world" }),
      worldSubscriptionsPath: subscriptionsPath,
    });

    tools.world.subscribe({ label: "private", root: privateWorld, priority: 0, autoPushEnabled: true });
    tools.world.subscribe({ label: "canonical", root: canonicalWorld, priority: 1, autoPushEnabled: false });

    const result = tools.world.propose({
      domain: "coding",
      name: "Internal Skill",
      description: "An internal-only skill.",
      body: "Use private context.",
      contributor: "agent-a",
      visibility: "internal",
      evidenceRunIds: ["run-1"],
    });

    expect(result.target.label).toBe("private");
    expect(result.path).toBe(join(privateWorld, "proposals", "skills", "coding", "internal-skill", "SKILL.md"));
    expect(readFileSync(result.path, "utf8")).toContain("visibility: internal");
    expect(readFileSync(result.path, "utf8")).toContain("- run-1");
  });

  test("publishes runs through subscribed worlds", () => {
    const root = mkdtempSync(join(tmpdir(), "self-tools-world-publish-run-"));
    const canonicalWorld = join(root, "canonical");
    const privateWorld = join(root, "private");
    const subscriptionsPath = join(root, "subscriptions.json");
    const state = new InMemoryStateRepository();
    const tools = createSelfTools({
      state,
      world: createLocalWorldReader({ root: "../the-world" }),
      worldSubscriptionsPath: subscriptionsPath,
    });
    const id = runId("run-publish-self-tool");

    tools.world.subscribe({ label: "private", root: privateWorld, priority: 0, autoPushEnabled: true });
    tools.world.subscribe({ label: "canonical", root: canonicalWorld, priority: 1, autoPushEnabled: false });
    tools.runs.create({
      id,
      agentId: agentId("agent-tools"),
      domain: "coding",
      goal: "publish a run",
      startedAt: "local",
      endedAt: "later",
      success: true,
      score: 0.9,
      notes: "Worked cleanly.",
      publishable: true,
      published: false,
      publishedAt: null,
      visibility: "public",
    });
    tools.episodes.append({
      id: episodeId("episode-publish-run"),
      runId: id,
      agentId: agentId("agent-tools"),
      timestamp: "local",
      tags: [],
      kind: "run_start",
      goal: "publish a run",
      domain: "coding",
    });

    const result = tools.world.publishRun({ runId: id, visibility: "public", contributor: "agent-a" });

    expect(result.target.label).toBe("canonical");
    expect(result.path).toBe(join(canonicalWorld, "proposals", "runs", String(id), "RUN.md"));
    expect(readFileSync(result.path, "utf8")).toContain("publish a run");
    expect(readFileSync(join(canonicalWorld, "proposals", "runs", String(id), "meta.yaml"), "utf8")).toContain("visibility: public");
  });

  test("publishes traces through subscribed worlds", () => {
    const root = mkdtempSync(join(tmpdir(), "self-tools-world-publish-trace-"));
    const canonicalWorld = join(root, "canonical");
    const privateWorld = join(root, "private");
    const subscriptionsPath = join(root, "subscriptions.json");
    const state = new InMemoryStateRepository();
    const tools = createSelfTools({
      state,
      world: createLocalWorldReader({ root: "../the-world" }),
      worldSubscriptionsPath: subscriptionsPath,
    });
    const id = runId("run-trace-self-tool");

    tools.world.subscribe({ label: "private", root: privateWorld, priority: 0, autoPushEnabled: true });
    tools.world.subscribe({ label: "canonical", root: canonicalWorld, priority: 1, autoPushEnabled: false });
    tools.runs.create({
      id,
      agentId: agentId("agent-tools"),
      domain: "coding",
      goal: "publish a trace",
      startedAt: "local",
      endedAt: "later",
      success: true,
      score: 0.9,
      notes: "",
      publishable: true,
      published: false,
      publishedAt: null,
      visibility: "internal",
    });
    const authored = tools.traces.author(id, ["Explain the critical step."], "coding");

    const result = tools.world.publishTrace({ traceId: authored.id, visibility: "internal", contributor: "agent-a" });

    expect(result.target.label).toBe("private");
    expect(result.path).toBe(join(privateWorld, "proposals", "traces", "coding", authored.id, "TRACE.md"));
    expect(readFileSync(result.path, "utf8")).toContain("Trace for run-trace-self-tool");
    expect(readFileSync(join(privateWorld, "proposals", "traces", "coding", authored.id, "meta.yaml"), "utf8")).toContain(
      "visibility: internal",
    );
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
