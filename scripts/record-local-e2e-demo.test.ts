import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, test } from "bun:test";

describe("local e2e demo recorder", () => {
  test("records an asciinema cast for local setup, local run, world pull/search, and sqlite verification", () => {
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
    expect(text).toContain("$ vivarium --setup");
    expect(text).not.toContain("$ vivarium start");
    expect(text).toContain("[1] Set up Vivarium");
    expect(text).toContain("[3] Open the dashboard");
    expect(text).toContain(
      "$ vivarium local run --domain coding --world-root <demo-world> --state-path <demo-state.db> --live-env-path <demo-live-readiness.local.env>",
    );
    expect(text).not.toContain('vivarium local run --goal "build a simple agent end to end"');
    expect(text).toContain("vivarium dashboard --open");
    expect(text).toContain("vivarium daemon smoke");
    expect(text).not.toContain("vivarium launch handoff\n  vivarium model");
    expect(text).toContain("$ vivarium status --state-path <demo-state.db> --live-env-path <demo-live-readiness.local.env>");
    expect(text).toContain("Last run: build a simple agent end to end");
    expect(text).toContain("Run ID: run-demo-000");
    expect(text).not.toContain("validate local cultural transmission");
    expect(text).not.toContain("Prove the local loop");
    expect(text).not.toContain("vivarium run --goal");
    expect(text).toContain("$ vivarium world transmission-smoke");
    expect(text).toContain("$ bun run verify:sqlite-stack");
    expect(text).not.toContain("bun apps/cli/src/main.ts");
    expect(text).toContain("Memory: <demo-state.db>");
    expect(text).toContain(
      "Recorded: vivarium status --state-path <demo-state.db> --live-env-path <demo-live-readiness.local.env> will show Run ID run-demo-000 with success state and score 0.8.",
    );
    expect(text).toContain("Readiness file: <demo-live-readiness.local.env>");
    expect(text).toContain("Vivarium World Transmission");
    expect(text).toContain("Status: ok");
    expect(text).toContain('"ok":true');
    expect(text).toContain('"engine":"better-sqlite3"');
    expect(text).toContain("<demo-state.db>");
    expect(text).toContain("<demo-world-second-install>");
    expect(text).toContain("run-demo-000");
    expect(text).toContain("vivarium status --state-path <demo-state.db> --live-env-path <demo-live-readiness.local.env>");
    expect(text).not.toContain("/Users/");
    expect(text).not.toContain("vivarium-local-e2e-demo-");
    expect(text).not.toContain(statePath);
    expect(text).not.toContain(pulledWorld);
    expect(text).not.toContain(root);
  }, 120_000);
});
