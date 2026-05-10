import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

import { proposeAntiPattern, proposeSkill, proposeSkillPullRequest } from "./push.js";
import { publishRun } from "./runs.js";
import { publishTrace } from "./traces.js";

describe("local world writes", () => {
  test("proposes a skill and publishes run and trace artifacts", () => {
    const root = mkdtempSync(join(tmpdir(), "world-write-"));

    const skillPath = proposeSkill({
      worldRoot: root,
      domain: "coding",
      slug: "local-skill",
      name: "Local Skill",
      description: "A locally proposed skill.",
      body: "Use local evidence.",
      contributor: "agent-a",
    });
    const runPath = publishRun({
      worldRoot: root,
      runId: "run-local",
      domain: "coding",
      goal: "prove publishing",
      outcome: "published locally",
    });
    const tracePath = publishTrace({
      worldRoot: root,
      domain: "coding",
      slug: "trace-local",
      title: "Trace Local",
      steps: ["frame", "act", "validate"],
    });

    expect(readFileSync(skillPath, "utf8")).toContain("# Local Skill");
    expect(readFileSync(runPath, "utf8")).toContain("# Outcome");
    expect(readFileSync(tracePath, "utf8")).toContain("# Goal");
  });

  test("proposes an anti-pattern artifact with evidence", () => {
    const root = mkdtempSync(join(tmpdir(), "world-write-anti-pattern-"));

    const path = proposeAntiPattern({
      worldRoot: root,
      domain: "coding",
      slug: "retrying-without-new-evidence",
      name: "Retrying Without New Evidence",
      description: "Repeating the same failing action without new evidence",
      why: "It burns time and compounds the original uncertainty.",
      insteadDo: "Gather a new observation before retrying.",
      contributor: "agent-a",
      evidenceRunIds: ["run-failed-retry"],
    });

    expect(path).toBe(
      join(root, "proposals", "anti-patterns", "coding", "retrying-without-new-evidence", "ANTI-PATTERN.md"),
    );
    expect(readFileSync(path, "utf8")).toContain("id: coding.retrying-without-new-evidence");
    expect(readFileSync(path, "utf8")).toContain("contributor: agent-a");
    expect(readFileSync(path, "utf8")).toContain("## What Not To Do\n\nRepeating the same failing action without new evidence");
    expect(readFileSync(path, "utf8")).toContain("## Evidence\n\n- run-failed-retry");
  });

  test("opens a skill proposal pull request when the push gate passes", async () => {
    const root = mkdtempSync(join(tmpdir(), "world-write-pr-"));
    const calls: unknown[] = [];

    const result = await proposeSkillPullRequest({
      worldRoot: root,
      domain: "coding",
      slug: "gated-skill",
      name: "Gated Skill",
      description: "A push-gated skill.",
      body: "Use evidence before pushing.",
      contributor: "agent-a",
      gate: { lowerBound: 0.6, uses: 5, coverage: 0.5 },
      client: {
        createPullRequest: async (request) => {
          calls.push(request);
          return { url: "https://github.example/pulls/7", number: 7 };
        },
      },
      head: "agent-a:gated-skill",
      base: "main",
    });

    expect(calls).toEqual([
      {
        title: "Add skill: Gated Skill",
        body: expect.stringContaining("proposals/skills/coding/gated-skill/SKILL.md"),
        head: "agent-a:gated-skill",
        base: "main",
      },
    ]);
    expect(result).toEqual({
      pushed: true,
      path: join(root, "proposals", "skills", "coding", "gated-skill", "SKILL.md"),
      gate: { lowerBound: 0.6, uses: 5, coverage: 0.5 },
      pullRequest: { url: "https://github.example/pulls/7", number: 7 },
    });
  });

  test("does not open a skill proposal pull request when the push gate fails", async () => {
    const root = mkdtempSync(join(tmpdir(), "world-write-no-pr-"));
    let called = false;

    const result = await proposeSkillPullRequest({
      worldRoot: root,
      domain: "coding",
      slug: "ungated-skill",
      name: "Ungated Skill",
      description: "A skill without enough evidence.",
      body: "Keep learning locally.",
      contributor: "agent-a",
      gate: { lowerBound: 0.59, uses: 5, coverage: 0.5 },
      client: {
        createPullRequest: async () => {
          called = true;
          return { url: "https://github.example/pulls/8", number: 8 };
        },
      },
      head: "agent-a:ungated-skill",
      base: "main",
    });

    expect(called).toBe(false);
    expect(result).toEqual({
      pushed: false,
      path: join(root, "proposals", "skills", "coding", "ungated-skill", "SKILL.md"),
      gate: { lowerBound: 0.59, uses: 5, coverage: 0.5 },
      reason: "Push gate not satisfied",
    });
  });
});
