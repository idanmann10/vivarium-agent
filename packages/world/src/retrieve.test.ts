import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

import { searchWorlds } from "./retrieve.js";
import { publishRun } from "./runs.js";

function addSkill(root: string, domain: string, slug: string, title: string): void {
  const directory = join(root, "domains", domain, "skills", slug);
  mkdirSync(directory, { recursive: true });
  writeFileSync(directory + "/SKILL.md", `---\ndescription: ${title}\n---\n\n# ${title}\n\nTest first.\n\n# Provenance\n\nFixture.\n`);
}

describe("searchWorlds", () => {
  test("searches multiple worlds and preserves source labels", () => {
    const publicWorld = mkdtempSync(join(tmpdir(), "public-world-"));
    const privateWorld = mkdtempSync(join(tmpdir(), "private-world-"));
    addSkill(publicWorld, "coding", "public-skill", "Public Skill");
    addSkill(privateWorld, "coding", "private-skill", "Private Skill");

    const results = searchWorlds({
      worlds: [
        { label: "private", root: privateWorld, priority: 0 },
        { label: "public", root: publicWorld, priority: 1 },
      ],
      domain: "coding",
      query: "test first",
    });

    expect(results.map((result) => result.source)).toEqual(["private", "public"]);
    expect(results.map((result) => result.title)).toEqual(["Private Skill", "Public Skill"]);
  });

  test("searches published runs across subscribed worlds", () => {
    const publicWorld = mkdtempSync(join(tmpdir(), "public-runs-world-"));
    const privateWorld = mkdtempSync(join(tmpdir(), "private-runs-world-"));
    publishRun({
      worldRoot: publicWorld,
      runId: "run-public-debugging",
      domain: "coding",
      goal: "debug a cache race",
      outcome: "added deterministic invalidation",
    });
    publishRun({
      worldRoot: privateWorld,
      runId: "run-private-debugging",
      domain: "coding",
      goal: "debug a private deploy",
      outcome: "added release guardrails",
    });

    const results = searchWorlds({
      worlds: [
        { label: "private", root: privateWorld, priority: 0 },
        { label: "public", root: publicWorld, priority: 1 },
      ],
      domain: "coding",
      query: "debug",
    });

    expect(results.map((result) => `${result.source}:${result.kind}:${result.title}`)).toEqual([
      "private:run:debug a private deploy",
      "public:run:debug a cache race",
    ]);
  });
});
