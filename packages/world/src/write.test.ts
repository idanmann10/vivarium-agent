import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

import { proposeSkill } from "./push.js";
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
});
