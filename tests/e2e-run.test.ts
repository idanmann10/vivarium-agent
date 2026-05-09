import { describe, expect, test } from "bun:test";

import { runCommand } from "../apps/cli/src/commands/run.js";

describe("cli run e2e", () => {
  test("runs a local goal and returns episode kinds", async () => {
    const result = await runCommand({
      goal: "write a test before implementation",
      domain: "coding",
      worldRoot: "../the-world",
    });

    expect(result.success).toBe(true);
    expect(result.episodeKinds).toContain("plan");
    expect(result.episodeKinds).toContain("reflection");
  });
});
