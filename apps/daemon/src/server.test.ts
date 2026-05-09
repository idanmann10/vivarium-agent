import { describe, expect, test } from "bun:test";

import { createDaemonServer } from "./server.js";

describe("createDaemonServer", () => {
  test("handles status, run, and dream requests", async () => {
    const daemon = createDaemonServer({ worldRoot: "../the-world" });

    expect(daemon.status()).toMatchObject({ status: "running", runs: 0 });

    const run = await daemon.run({ goal: "write a test", domain: "coding" });
    const dream = daemon.dream({ coding: { runsCompleted: 4, successRate: 1, skillDiversity: 2 } });

    expect(run.success).toBe(true);
    expect(daemon.status().runs).toBe(1);
    expect(dream.identitySummary).toContain("coding");
  });
});
