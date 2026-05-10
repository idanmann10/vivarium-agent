import { spawnSync } from "node:child_process";
import { describe, expect, test } from "bun:test";

describe("better-sqlite3 stack verifier", () => {
  test("runs runtime migrations through Node and better-sqlite3", () => {
    const result = spawnSync("bun", ["run", "verify:sqlite-stack"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    const jsonLine = result.stdout.trim().split("\n").at(-1);

    expect(result.stderr).toContain("node scripts/verify-better-sqlite3.cjs");
    expect(result.stderr).not.toContain("Error:");
    expect(result.status).toBe(0);
    expect(JSON.parse(jsonLine ?? "")).toEqual({
      ok: true,
      engine: "better-sqlite3",
      migrations: ["0001_initial", "0002_semantic_facts", "0003_dream_candidates", "0004_tool_usage"],
      tables: [
        "confidence_buckets",
        "curriculum_progress",
        "dream_candidates",
        "episodes",
        "identity",
        "local_skills",
        "publishable_artifacts",
        "runs",
        "schema_migrations",
        "semantic_facts",
        "tool_usage",
      ],
      sampleSkillId: "skill-smoke",
    });
  });
});
