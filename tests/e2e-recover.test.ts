import { describe, expect, test } from "bun:test";

import { runCommand } from "../apps/cli/src/commands/run.js";

describe("cli recovery e2e", () => {
  test("forced failure records recovery", async () => {
    const result = await runCommand({
      goal: "force failure",
      domain: "coding",
      worldRoot: "../the-world",
      forceFailure: true,
    });

    expect(result.success).toBe(false);
    expect(result.episodeKinds).toContain("monitor_signal");
    expect(result.episodeKinds).toContain("recovery");
  });
});
