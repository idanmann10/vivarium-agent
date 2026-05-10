import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, test } from "bun:test";

describe("local e2e demo recorder", () => {
  test("records an asciinema cast for init, run, world pull/search, and sqlite verification", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-demo-test-"));
    const output = join(root, "local-e2e.cast");
    const statePath = join(root, "state.db");
    const pulledWorld = join(root, "world-second-install");

    const result = spawnSync(
      "bun",
      [
        "run",
        "record:local-e2e-demo",
        "--",
        "--output",
        output,
        "--state-path",
        statePath,
        "--pull-destination",
        pulledWorld,
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(existsSync(output)).toBe(true);

    const [headerLine, ...eventLines] = readFileSync(output, "utf8").trim().split("\n");
    expect(JSON.parse(headerLine ?? "")).toMatchObject({ version: 2, width: 120, height: 36, timestamp: 0 });

    const text = eventLines.map((line) => JSON.parse(line)[2]).join("");
    expect(text).toContain("$ bun apps/cli/src/index.ts init");
    expect(text).toContain("$ bun apps/cli/src/index.ts run");
    expect(text).toContain("$ bun apps/cli/src/index.ts world transmission-smoke");
    expect(text).toContain("$ bun run verify:sqlite-stack");
    expect(text).toContain('"ok": true');
    expect(text).toContain('"engine":"better-sqlite3"');
    expect(text).toContain("<demo-state.db>");
    expect(text).toContain("<demo-world-second-install>");
    expect(text).toContain("run-demo-000");
    expect(text).not.toContain(statePath);
    expect(text).not.toContain(pulledWorld);
    expect(text).not.toContain(root);
  });
});
