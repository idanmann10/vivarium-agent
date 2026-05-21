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

    expect(run.success).toBe(true);
    expect(daemon.status().runs).toBe(1);
    expect(daemon.status()).toMatchObject({
      skills: {
        total: 0,
        promoted: 0,
        candidates: 0,
        archived: 0,
        habitual: 0,
      },
      memory: {
        semanticFacts: 0,
        traceCandidates: 0,
        antiPatternCandidates: 0,
        publishableArtifacts: 0,
      },
      domains: [
        {
          name: "coding",
          runs: 1,
          skills: 0,
          successRate: 1,
          latestGoal: "write a test",
        },
      ],
      recentRuns: [
        {
          goal: "write a test",
          domain: "coding",
          success: true,
          score: 0.8,
        },
      ],
      latestRun: {
        goal: "write a test",
        domain: "coding",
        success: true,
        score: 0.8,
      },
    });
    const dream = daemon.dream({ coding: { runsCompleted: 4, successRate: 1, skillDiversity: 2 } });
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
