import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, test } from "bun:test";

import { SQLiteStateRepository } from "../../../../packages/state/src/index.js";
import { renderInitCommandResult, runInitCommand } from "./init.js";

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
  test("defaults to a named local agent under the Vivarium home directory", () => {
    const worldRoot = createWorldFixture();
    const home = mkdtempSync(join(tmpdir(), "init-home-"));
    const previousHome = process.env.HOME;
    process.env.HOME = home;

    try {
      const result = runInitCommand({
        primaryDomain: "coding",
        bindGithubIdentity: false,
        worldRoot,
      });

      expect(result).toMatchObject({
        agentName: "local-agent",
        statePath: join(home, ".vivarium", "state.db"),
      });

      const state = new SQLiteStateRepository(result.statePath);
      expect(state.getIdentity()).toMatchObject({
        name: "local-agent",
        summary: "Newborn local agent initialized for coding.",
      });
      state.close();
    } finally {
      if (previousHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = previousHome;
      }
    }
  });

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
    expect(result.worldRoot).toBe(worldRoot);
    expect(result.agentName).toBe("local-agent");
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
    expect(state.getIdentity()).toMatchObject({
      name: "local-agent",
      devStages: { coding: "newborn" },
      runsCompleted: 0,
    });
    state.close();
  });

  test("renders branded setup guidance for terminal use", () => {
    const output = renderInitCommandResult({
      agentName: "local-agent",
      primaryDomain: "coding",
      statePath: "/tmp/vivarium-state.db",
      worldRoot: "/tmp/world",
      starterSkills: [
        {
          id: "domains/coding/skills/red-green/SKILL.md",
          title: "Red Green",
          path: "/tmp/world/domains/coding/skills/red-green/SKILL.md",
        },
      ],
      starterTraces: [],
      curriculumPath: "/tmp/world/domains/coding/curriculum.md",
      migrations: ["0001_initial"],
      prompts: ["Configure provider: anthropic"],
    });

    expect(output).toContain("Vivarium Init");
    expect(output).toContain("Agent: local-agent");
    expect(output).toContain("Domain: coding");
    expect(output).toContain("Starter skills: 1");
    expect(output).toContain("Prompts:");
    expect(output).toContain("Next command:");
    expect(output).toContain(
      'vivarium local run --goal "build a tiny local agent" --domain coding --state-path /tmp/vivarium-state.db --world-root /tmp/world',
    );
    expect(output).not.toContain("vivarium run --goal");
    expect(output.trim().startsWith("{")).toBe(false);
  });
});
