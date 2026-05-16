import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { renderStatusCommandResult, statusCommand } from "./status.js";

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
      expect(output).toContain("vivarium launch handoff");
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

  test("renders a production readiness dashboard without raw setup keys", () => {
    const result = statusCommand({
      statePath: ".vivarium/state.db",
      liveEnvPath: "live-readiness.local.env",
      pathExists: (path) =>
        path === ".vivarium/state.db" || path === "live-readiness.local.env",
    });
    const output = renderStatusCommandResult(result);

    expect(result.localState).toEqual({
      path: ".vivarium/state.db",
      ready: true,
    });
    expect(result.liveSetup).toEqual({
      path: "live-readiness.local.env",
      staged: true,
    });
    expect(output).toContain("Production readiness");
    expect(output).toContain("[ready] Local state: .vivarium/state.db");
    expect(output).toContain("[staged] Live setup file: live-readiness.local.env");
    expect(output).not.toContain("[ready] Live setup file: live-readiness.local.env");
    expect(output).toContain("vivarium local run");
    expect(output).toContain("vivarium connect");
    expect(output).toContain("vivarium model");
    expect(output).toContain("vivarium proof");
    expect(output).toContain("vivarium doctor --live");
    expect(output).not.toContain("ANTHROPIC_API_KEY");
    expect(output).not.toContain("VIVARIUM_PROVIDER_PROFILES_PATH");
    expect(output).not.toContain("--env-file live-readiness.local.env");
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
