import { mkdirSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

import { scoreCompoundingImprovement } from "../packages/eval/src/index.js";
import { proposeSkill, searchWorlds } from "../packages/world/src/index.js";

describe("world integration e2e", () => {
  test("install A proposes a skill and install B retrieves it", () => {
    const publicWorld = mkdtempSync(join(tmpdir(), "public-world-"));
    const privateWorld = mkdtempSync(join(tmpdir(), "private-world-"));
    mkdirSync(join(publicWorld, "domains", "coding"), { recursive: true });

    proposeSkill({
      worldRoot: privateWorld,
      domain: "coding",
      slug: "transmitted-skill",
      name: "Transmitted Skill",
      description: "Skill proposed by install A.",
      body: "Always validate cultural transmission with a second install.",
      contributor: "install-a",
    });

    const results = searchWorlds({
      worlds: [
        { label: "private", root: privateWorld, priority: 0 },
        { label: "public", root: publicWorld, priority: 1 },
      ],
      domain: "coding",
      query: "validate cultural transmission",
    });
    const compounding = scoreCompoundingImprovement({
      beforeProceduralHits: 0,
      afterProceduralHits: results.length,
      beforeValidationScore: 0.5,
      afterValidationScore: 0.8,
    });

    expect(results[0]?.title).toBe("Transmitted Skill");
    expect(results[0]?.source).toBe("private");
    expect(compounding.improved).toBe(true);
  });
});
