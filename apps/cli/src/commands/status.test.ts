import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { agentId, runId, skillId } from "../../../../packages/core/src/index.js";
import { SQLiteStateRepository } from "../../../../packages/state/src/index.js";
import { renderStatusCommandResult, statusCommand } from "./status.js";

function seedReadyLocalState(statePath: string): void {
  const state = new SQLiteStateRepository(statePath);
  state.upsertLocalSkill({
    id: skillId("coding.status-ready"),
    name: "Status Ready",
    domain: "coding",
    status: "promoted",
    uses: 0,
    helped: 0,
    lastUsedRunOffset: 0,
    habitual: false,
    body: "A promoted starter skill.",
  });
  state.setIdentity({
    agentId: agentId("local-agent"),
    name: "local-agent",
    devStages: { coding: "newborn" },
    runsCompleted: 0,
    summary: "Local agent initialized.",
    updatedAt: "local",
  });
  state.close();
}

function seedCompletedRun(statePath: string): void {
  const state = new SQLiteStateRepository(statePath);
  state.createRun({
    id: runId("run-status-001"),
    agentId: agentId("local-agent"),
    domain: "coding",
    goal: "build a simple agent end to end",
    startedAt: "2026-05-17T04:00:00.000Z",
    endedAt: "2026-05-17T04:00:03.000Z",
    success: true,
    score: 0.8,
    notes: "Completed local runtime slice",
    publishable: false,
    published: false,
    publishedAt: null,
    visibility: "private",
  });
  state.close();
}

describe("statusCommand", () => {
  test("renders branded local runtime status", () => {
    const home = mkdtempSync(join(tmpdir(), "status-home-"));
    const previousHome = process.env.HOME;
    process.env.HOME = home;

    try {
      const result = statusCommand();
      const output = renderStatusCommandResult(result);

      expect(result).toMatchObject({
        repo: "vivarium-agent",
        runtime: "offline-local",
        localState: { path: join(home, ".vivarium", "state.db") },
      });
      expect(output).toContain("Vivarium Status");
      expect(output).toContain("VIVARIUM // local memory // world culture");
      expect(output).toContain("Repository: vivarium-agent");
      expect(output).toContain("Runtime: offline-local");
      expect(output).toContain(`Local state: ${join(home, ".vivarium", "state.db")}`);
      expect(output).toContain("vivarium local");
      expect(output).toContain("Create the local agent.");
      expect(output).not.toContain("vivarium run --goal <goal>");
      expect(output).toContain("vivarium dashboard --open");
      expect(output).toContain("vivarium daemon smoke");
      expect(output).not.toContain("vivarium launch handoff");
      expect(output).not.toContain("vivarium model");
      expect(output).toContain("vivarium help");
    } finally {
      if (previousHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = previousHome;
      }
    }
  });

  test("defaults live setup status to the private Vivarium live file", () => {
    const home = mkdtempSync(join(tmpdir(), "status-private-live-home-"));
    const liveEnvPath = join(home, ".vivarium", "live", "live-readiness.local.env");
    const previousHome = process.env.HOME;
    mkdirSync(join(home, ".vivarium", "live"), { recursive: true });
    writeFileSync(liveEnvPath, "# local readiness\n", "utf8");
    process.env.HOME = home;

    try {
      const result = statusCommand();
      const output = renderStatusCommandResult(result);

      expect(result.liveSetup).toEqual({
        path: liveEnvPath,
        staged: true,
      });
      expect(output).toContain(`[staged] Live setup file: ${liveEnvPath}`);
    } finally {
      if (previousHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = previousHome;
      }
    }
  });

  test("does not mark invalid local state ready", () => {
    const home = mkdtempSync(join(tmpdir(), "status-invalid-state-home-"));
    const statePath = join(home, ".vivarium", "state.db");
    mkdirSync(join(home, ".vivarium"), { recursive: true });
    writeFileSync(statePath, "not a sqlite database", "utf8");

    const result = statusCommand({ statePath });
    const output = renderStatusCommandResult(result);

    expect(result.localState).toEqual({
      path: statePath,
      ready: false,
    });
    expect(output).toContain(`[needs] Local state: ${statePath}`);
    expect(output).toContain("vivarium local");
    expect(output).toContain("Create the local agent.");
  });

  test("does not mark unseeded local state ready", () => {
    const home = mkdtempSync(join(tmpdir(), "status-unseeded-state-home-"));
    const statePath = join(home, ".vivarium", "state.db");
    const state = new SQLiteStateRepository(statePath);
    state.close();

    const result = statusCommand({ statePath });
    const output = renderStatusCommandResult(result);

    expect(result.localState).toEqual({
      path: statePath,
      ready: false,
    });
    expect(output).toContain(`[needs] Local state: ${statePath}`);
    expect(output).toContain("vivarium local");
    expect(output).toContain("Create the local agent.");
  });

  test("renders a production readiness dashboard without raw setup keys", () => {
    const root = mkdtempSync(join(tmpdir(), "status-ready-dashboard-"));
    const statePath = join(root, ".vivarium", "state.db");
    const liveEnvPath = join(root, "live-readiness.local.env");
    seedReadyLocalState(statePath);
    writeFileSync(liveEnvPath, "# local readiness\n", "utf8");

    const result = statusCommand({
      statePath,
      liveEnvPath,
      pathExists: (path) =>
        path === statePath || path === liveEnvPath,
    });
    const output = renderStatusCommandResult(result);

    expect(result.localState).toEqual({
      path: statePath,
      ready: true,
    });
    expect(result.liveSetup).toEqual({
      path: liveEnvPath,
      staged: true,
    });
    expect(output).toContain("Production readiness");
    expect(output).toContain(`[ready] Local state: ${statePath}`);
    expect(output).toContain(`[staged] Live setup file: ${liveEnvPath}`);
    expect(output).not.toContain(`[ready] Live setup file: ${liveEnvPath}`);
    expect(output).toContain("vivarium local run");
    expect(output).toContain("vivarium dashboard --open");
    expect(output).toContain("vivarium daemon smoke");
    expect(output).toContain("vivarium connect");
    expect(output).not.toContain("vivarium model");
    expect(output).not.toContain("Inspect provider profile readiness.");
    expect(output).not.toContain("Inspect configured provider profiles.");
    expect(output).toContain("vivarium proof");
    expect(output).toContain("vivarium doctor --live");
    expect(output).not.toContain("vivarium launch handoff");
    expect(output).not.toContain("ANTHROPIC_API_KEY");
    expect(output).not.toContain("VIVARIUM_PROVIDER_PROFILES_PATH");
    expect(output).not.toContain("--env-file live-readiness.local.env");
  });

  test("shows the latest local run after the simple-agent smoke", () => {
    const root = mkdtempSync(join(tmpdir(), "status-latest-run-"));
    const statePath = join(root, ".vivarium", "state.db");
    seedReadyLocalState(statePath);
    seedCompletedRun(statePath);

    const result = statusCommand({ statePath });
    const output = renderStatusCommandResult(result);

    expect(result.localState?.lastRun).toEqual({
      id: "run-status-001",
      goal: "build a simple agent end to end",
      domain: "coding",
      success: true,
      score: 0.8,
    });
    expect(output).toContain("Last run: build a simple agent end to end");
    expect(output).not.toContain("build a tiny local agent");
    expect(output).toContain("success, score 0.8");
    expect(output).toContain("Run ID: run-status-001");
  });

  test("keeps explicit local paths in the next run command", () => {
    const root = mkdtempSync(join(tmpdir(), "status-explicit-path-next-run-"));
    const statePath = join(root, "state.db");
    const liveEnvPath = join(root, "live-readiness.local.env");
    seedReadyLocalState(statePath);
    writeFileSync(liveEnvPath, "# local readiness\n", "utf8");

    const result = statusCommand({ statePath, liveEnvPath });
    const output = renderStatusCommandResult(result);

    expect(output).toContain(
      `vivarium local run --state-path ${statePath} --live-env-path ${liveEnvPath}`,
    );
  });

  test("keeps explicit live paths in the next setup command", () => {
    const root = mkdtempSync(join(tmpdir(), "status-explicit-live-next-setup-"));
    const statePath = join(root, "state.db");
    const liveEnvPath = join(root, "live-readiness.local.env");
    seedReadyLocalState(statePath);

    const result = statusCommand({ statePath, liveEnvPath });
    const output = renderStatusCommandResult(result);

    expect(output).toContain(`vivarium connect init --path ${liveEnvPath}`);
    expect(output).not.toContain("vivarium setup live");
  });

  test("points missing live setup at guided onboarding", () => {
    const home = mkdtempSync(join(tmpdir(), "status-missing-live-home-"));
    const previousHome = process.env.HOME;
    process.env.HOME = home;

    try {
      const liveEnvPath = join(home, ".vivarium", "live", "live-readiness.local.env");
      const result = statusCommand({
        statePath: ".vivarium/state.db",
        pathExists: (path) => path === ".vivarium/state.db",
      });
      const output = renderStatusCommandResult(result);

      expect(result.liveSetup).toEqual({
        path: liveEnvPath,
        staged: false,
      });
      expect(output).toContain(`[needs] Live setup file: ${liveEnvPath}`);
      expect(output).toContain("vivarium setup live");
      expect(output).not.toContain("vivarium onboard live");
      expect(output).toContain("Start guided live onboarding.");
      expect(output).not.toContain("vivarium connect init");
      expect(output).not.toContain("Create the private live setup file.");
    } finally {
      if (previousHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = previousHome;
      }
    }
  });
});
