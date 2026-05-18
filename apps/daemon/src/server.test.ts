import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createDaemonServer } from "./server.js";

describe("createDaemonServer", () => {
  test("handles status, run, and dream requests", async () => {
    const daemon = createDaemonServer({ worldRoot: "../the-world" });

    expect(daemon.status()).toMatchObject({ status: "running", runs: 0 });

    const run = await daemon.run({ goal: "write a test", domain: "coding" });
    const dream = daemon.dream({ coding: { runsCompleted: 4, successRate: 1, skillDiversity: 2 } });

    expect(run.success).toBe(true);
    expect(daemon.status().runs).toBe(1);
    expect(daemon.status().latestRun).toMatchObject({
      goal: "write a test",
      domain: "coding",
      success: true,
      score: 0.8,
    });
    expect(dream.identitySummary).toContain("coding");
  });

  test("persists runs when created with a SQLite state path", async () => {
    const statePath = join(mkdtempSync(join(tmpdir(), "vivarium-daemon-state-")), "state.db");
    const daemon = createDaemonServer({ statePath, worldRoot: "../the-world" });

    await daemon.run({ goal: "write persistent daemon memory", domain: "coding" });

    expect(daemon.status()).toMatchObject({ runs: 1, statePath });
    expect(createDaemonServer({ statePath, worldRoot: "../the-world" }).status()).toMatchObject({
      runs: 1,
      statePath,
    });
  });
});
