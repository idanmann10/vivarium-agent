import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, test } from "bun:test";

import { SQLiteStateRepository } from "../../../../packages/state/src/index.js";
import { runInitCommand } from "./init.js";

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function createWorldFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "init-world-"));
  write(join(root, "domains", "coding", "curriculum.md"), "# Coding Curriculum\n");
  write(join(root, "domains", "coding", "skills", "red-green", "SKILL.md"), "# Red Green\n\nCoding test skill.");
  write(join(root, "domains", "coding", "skills", "small-steps", "SKILL.md"), "# Small Steps\n\nCoding small steps.");
  write(join(root, "domains", "coding", "traces", "debugging", "TRACE.md"), "# Debugging Trace\n\nA coding trace.");
  return root;
}

describe("runInitCommand", () => {
  test("runs migrations and installs starter skills from the selected domain", () => {
    const worldRoot = createWorldFixture();
    const statePath = join(mkdtempSync(join(tmpdir(), "init-state-")), "state.db");

    const result = runInitCommand({
      primaryDomain: "coding",
      bindGithubIdentity: true,
      worldRoot,
      statePath,
      providerProfiles: ["anthropic"],
      credentialNames: ["STRIPE_API_KEY"],
    });

    expect(result.primaryDomain).toBe("coding");
    expect(result.statePath).toBe(statePath);
    expect(result.starterSkills.map((skill) => skill.title).sort()).toEqual(["Red Green", "Small Steps"]);
    expect(result.starterTraces.map((trace) => trace.title)).toEqual(["Debugging Trace"]);
    expect(result.curriculumPath).toBe(join(worldRoot, "domains", "coding", "curriculum.md"));
    expect(result.migrations).toEqual([
      "0001_initial",
      "0002_semantic_facts",
      "0003_dream_candidates",
      "0004_tool_usage",
    ]);
    expect(result.prompts).toEqual([
      "Bind GitHub identity",
      "Configure provider: anthropic",
      "Add credential: STRIPE_API_KEY",
    ]);

    const state = new SQLiteStateRepository(statePath);
    expect(state.listLocalSkills().map((skill) => skill.name).sort()).toEqual(["Red Green", "Small Steps"]);
    state.close();
  });
});
