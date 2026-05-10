import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, test } from "bun:test";

import { SQLiteStateRepository } from "../packages/state/src/index.js";
import { dispatchCliCommand } from "../apps/cli/src/dispatcher.js";

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function createWorldFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "cli-install-flow-world-"));
  write(join(root, "domains", "coding", "curriculum.md"), "# Coding Curriculum\n");
  write(join(root, "domains", "coding", "skills", "red-green", "SKILL.md"), "# Red Green\n\nCoding test skill.");
  write(join(root, "domains", "coding", "skills", "small-steps", "SKILL.md"), "# Small Steps\n\nCoding small steps.");
  write(join(root, "domains", "coding", "traces", "debugging", "TRACE.md"), "# Debugging Trace\n\nA coding trace.");
  return root;
}

describe("cli install flow", () => {
  test("runs init then run against the same SQLite state", async () => {
    const worldRoot = createWorldFixture();
    const statePath = join(mkdtempSync(join(tmpdir(), "cli-install-flow-state-")), "state.db");

    await dispatchCliCommand([
      "init",
      "--domain",
      "coding",
      "--world-root",
      worldRoot,
      "--state-path",
      statePath,
      "--provider",
      "anthropic",
      "--credential",
      "INTERNAL_API_KEY",
    ]);
    const run = await dispatchCliCommand([
      "run",
      "--goal",
      "write a test before implementation",
      "--domain",
      "coding",
      "--world-root",
      worldRoot,
      "--state-path",
      statePath,
    ]);

    const state = new SQLiteStateRepository(statePath);
    const runs = state.listRuns();
    const runId = runs[0]?.id;

    expect(run.result).toMatchObject({ success: true });
    expect(state.listLocalSkills().map((skill) => skill.name).sort()).toEqual(["Red Green", "Small Steps"]);
    expect(runs).toHaveLength(1);
    expect(runId).toBeDefined();
    expect(runId === undefined ? [] : state.listEpisodes(runId).map((episode) => episode.kind)).toContain("plan");
    expect(state.getCurriculumProgress("coding")?.completedSteps).toEqual([0]);
    state.close();
  });
});
