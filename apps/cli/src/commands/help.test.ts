import { describe, expect, test } from "bun:test";

import {
  daemonSmokeHelpCommand,
  helpCommand,
  launchHandoffHelpCommand,
  localRunHelpCommand,
  localSetupHelpCommand,
  renderDaemonSmokeHelpCommandResult,
  renderHelpCommandResult,
  renderLaunchHandoffHelpCommandResult,
  renderLocalRunHelpCommandResult,
  renderLocalSetupHelpCommandResult,
  renderStatusHelpCommandResult,
  statusHelpCommand,
} from "./help.js";

describe("helpCommand", () => {
  test("renders branded first-run command help", () => {
    const result = helpCommand();
    const output = renderHelpCommandResult(result);
    const firstRunBlock = output.slice(output.indexOf("First run"), output.indexOf("Commands"));

    expect(result.commands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ command: "vivarium onboard" }),
        expect.objectContaining({ command: "vivarium setup live" }),
        expect.objectContaining({ command: "vivarium onboard live" }),
        expect.objectContaining({ command: "vivarium local" }),
        expect.objectContaining({ command: "vivarium local run" }),
        expect.objectContaining({ command: "vivarium setup" }),
        expect.objectContaining({ command: "vivarium status" }),
        expect.objectContaining({ command: "vivarium doctor" }),
        expect.objectContaining({ command: "vivarium connect" }),
        expect.objectContaining({
          command: "vivarium model",
          description: "Show provider profile readiness.",
        }),
        expect.objectContaining({
          command: "vivarium tools",
          description: "Show external toolsets and safety policy posture.",
        }),
        expect.objectContaining({ command: "vivarium connect init" }),
        expect.objectContaining({
          command: "vivarium connect signup",
          description: "Show account links and the local value map.",
        }),
        expect.objectContaining({
          command: "vivarium connect fill",
        }),
        expect.objectContaining({
          command: "vivarium connect setup --confirm-write",
        }),
        expect.objectContaining({ command: "vivarium connect smoke" }),
        expect.objectContaining({ command: "vivarium proof init" }),
        expect.objectContaining({ command: "vivarium proof" }),
        expect.objectContaining({
          command: "vivarium daemon smoke",
        }),
        expect.objectContaining({ command: "vivarium launch handoff" }),
        expect.objectContaining({ command: "vivarium update" }),
      ]),
    );
    expect(output).toContain("Vivarium Agent");
    expect(output).toContain("VIVARIUM // local memory // world culture");
    expect(output).toContain("First run");
    expect(output).toContain("vivarium local");
    expect(output).toContain("vivarium local run");
    expect(output).toContain("vivarium onboard");
    expect(output).toContain("vivarium setup live");
    expect(output).toContain("vivarium onboard live");
    expect(output).toContain("vivarium setup");
    expect(output).not.toContain("vivarium setup --quick");
    expect(output).not.toContain('vivarium run --goal "validate local setup"');
    expect(output).not.toContain("vivarium run --goal <goal>");
    expect(output).toContain("vivarium connect init");
    expect(output).toContain("vivarium connect");
    expect(output).not.toContain("vivarium connect --env-file live-readiness.local.env");
    expect(output).toContain("vivarium connect signup");
    expect(output).toContain("vivarium connect fill");
    expect(output).toContain("vivarium connect setup --confirm-write");
    expect(output).toContain("vivarium connect smoke");
    expect(output).toContain("vivarium proof init");
    expect(output).toContain("vivarium proof");
    expect(output).not.toContain("vivarium live env-init");
    expect(output).not.toContain("vivarium live evidence-init");
    expect(output).toContain("vivarium model");
    expect(output).toContain("vivarium tools");
    expect(output).toContain("vivarium help");
    expect(firstRunBlock).toContain("vivarium local");
    expect(firstRunBlock).toContain("vivarium local run");
    expect(result.commands.some((item) => item.command.startsWith("vivarium run --goal"))).toBe(false);
    expect(firstRunBlock).not.toContain(
      "vivarium run --goal \"validate local setup\" --state-path .vivarium/state.db",
    );
    expect(firstRunBlock).toContain("[1] Initialize local memory");
    expect(firstRunBlock).not.toContain("vivarium onboard");
    expect(firstRunBlock).toContain("[2] Run the local agent");
    expect(firstRunBlock).toContain("[3] Review launch handoff");
    expect(firstRunBlock).toContain("[4] Keep moving");
    expect(firstRunBlock).not.toContain("Verify the Mac daemon");
    expect(firstRunBlock).not.toContain("vivarium daemon smoke --status-url http://127.0.0.1:8787/status");
    expect(output).toContain("vivarium daemon smoke");
    expect(output).not.toContain("vivarium daemon smoke --status-url http://127.0.0.1:8787/status");
    expect(firstRunBlock).toContain("vivarium launch handoff");
    expect(firstRunBlock).toContain("vivarium status");
    expect(firstRunBlock).toContain("vivarium help");
    expect(firstRunBlock).toContain("vivarium update");
    expect(firstRunBlock).not.toContain("vivarium setup --env-file live-readiness.local.env");
    expect(firstRunBlock).not.toContain("vivarium model --env-file live-readiness.local.env");
    expect(firstRunBlock).not.toContain("vivarium live evidence-init --path v1-evidence.json");
    expect(firstRunBlock).not.toContain("vivarium doctor --live --env-file live-readiness.local.env");
    expect(firstRunBlock).not.toContain("vivarium setup --quick --domain coding --world-root ../the-world --state-path .vivarium/state.db");
    expect(firstRunBlock).not.toContain("[7] Continue");
    expect(firstRunBlock).not.toContain("[8] Continue");
    expect(firstRunBlock).not.toContain("  vivarium doctor                                     Check readiness.");
    expect(firstRunBlock).not.toContain("  vivarium model                                      Show provider setup.");
    expect(output).not.toContain("Show configured provider profiles.");
    const onboardLiveRow = output
      .split("\n")
      .find((line) => line.includes("Alias for the live setup wizard."));
    expect(onboardLiveRow).toMatch(/onboard live\s{2,}Alias/);
    const setupLiveRow = output
      .split("\n")
      .find((line) => line.includes("Run the full live setup wizard with private default files."));
    expect(setupLiveRow).toMatch(/setup live\s{2,}Run/);
    const liveEnvInitRow = output
      .split("\n")
      .find((line) => line.includes("Lower-level setup file creation for custom paths."));
    expect(liveEnvInitRow).toMatch(/connect init\s{2,}Lower-level/);
    expect(result.commands.filter((item) => item.command === "vivarium connect")).toHaveLength(1);
    const connectWizardRow = output
      .split("\n")
      .find((line) => line.includes("Custom-path live setup for advanced operators."));
    expect(connectWizardRow).toMatch(/connect wizard\s{2,}Custom-path/);
    expect(output).not.toContain("Create the private live setup file.");
    expect(output).not.toContain("Create or reuse the private live setup file");
    const liveSetupConfirmRow = output
      .split("\n")
      .find((line) => line.includes("Write live setup files after reviewing readiness."));
    expect(liveSetupConfirmRow).toMatch(/--confirm-write\s{2,}Write/);
  });

  test("renders focused local run help for simple-agent operators", () => {
    const result = localRunHelpCommand();
    const output = renderLocalRunHelpCommandResult(result);

    expect(output).toContain("Vivarium Local Run");
    expect(output).toContain("Usage: vivarium local run");
    expect(output).not.toContain('Usage: vivarium local run --goal "build a simple agent end to end"');
    expect(output).toContain("--goal <text>");
    expect(output).toContain("--state-path <path>");
    expect(output).toContain("--world-root <path>");
    expect(output).toContain("--live-env-path <path>");
    expect(output).toContain("--env-file <path>");
    expect(output).toContain("--provider-profile <name>");
    expect(output).toContain("\n  vivarium local run\n");
    expect(output).not.toContain('vivarium local run --goal "build a simple agent end to end"');
    expect(output).toContain(
      'vivarium local run --goal "summarize this repo" --state-path ./vivarium-state.db --live-env-path ./live-readiness.local.env',
    );
    expect(output).not.toContain("--state-path ~/.vivarium/state.db");
    expect(output).not.toContain("--live-env-path ~/.vivarium/live/live-readiness.local.env");
    expect(output).not.toContain("build a tiny local agent");
    expect(output).toContain("vivarium status");
    expect(output).not.toContain("Commands");
    expect(output).not.toContain("vivarium run --goal");
  });

  test("renders focused local setup help for first-run operators", () => {
    const result = localSetupHelpCommand();
    const output = renderLocalSetupHelpCommandResult(result);

    expect(output).toContain("Vivarium Local Setup");
    expect(output).toContain("Usage: vivarium local");
    expect(output).toContain("--state-path <path>");
    expect(output).toContain("--world-root <path>");
    expect(output).toContain("--live-env-path <path>");
    expect(output).toContain("--github-owner <name>");
    expect(output).toContain("vivarium local --domain research");
    expect(output).not.toContain("--state-path ~/.vivarium/state.db");
    expect(output).not.toContain("--world-root ~/.vivarium/the-world");
    expect(output).not.toContain("--live-env-path ~/.vivarium/live/live-readiness.local.env");
    expect(output).toContain("\n  vivarium local run\n");
    expect(output).not.toContain('vivarium local run --goal "build a simple agent end to end"');
    expect(output).not.toContain("build a tiny local agent");
    expect(output).not.toContain("Commands");
    expect(output).not.toContain("vivarium run --goal");
  });

  test("renders focused status help for local proof checks", () => {
    const result = statusHelpCommand();
    const output = renderStatusHelpCommandResult(result);

    expect(output).toContain("Vivarium Status");
    expect(output).toContain("Usage: vivarium status");
    expect(output).toContain("--state-path <path>");
    expect(output).toContain("--live-env-path <path>");
    expect(output).toContain(
      "vivarium status --state-path ./vivarium-state.db --live-env-path ./live-readiness.local.env",
    );
    expect(output).not.toContain("--state-path ~/.vivarium/state.db");
    expect(output).not.toContain("--live-env-path ~/.vivarium/live/live-readiness.local.env");
    expect(output).toContain("vivarium local run");
    expect(output).toContain("vivarium proof");
    expect(output).toContain("vivarium doctor --live");
    expect(output).not.toContain("Commands");
    expect(output).not.toContain("vivarium run --goal");
  });

  test("renders focused launch handoff help for Mac operators", () => {
    const result = launchHandoffHelpCommand();
    const output = renderLaunchHandoffHelpCommandResult(result);

    expect(output).toContain("Vivarium Launch Handoff");
    expect(output).toContain("Usage: vivarium launch handoff");
    expect(output).toContain("--ref <branch-or-tag-or-commit>");
    expect(output).toContain("--script-ref <commit-or-tag>");
    expect(output).toContain("--daemon-host <host>");
    expect(output).toContain("--daemon-port <port>");
    expect(output).toContain("--pr-number <number>");
    expect(output).toContain("--reviewer <github-username>");
    expect(output).toContain("vivarium launch handoff --pr-number 26 --reviewer REVIEWER_GITHUB_USERNAME");
    expect(output).toContain("vivarium local run");
    expect(output).toContain("vivarium doctor --live");
    expect(output).not.toContain("Commands");
    expect(output).not.toContain("vivarium run --goal");
  });

  test("renders focused daemon smoke help for Mac operators", () => {
    const result = daemonSmokeHelpCommand();
    const output = renderDaemonSmokeHelpCommandResult(result);

    expect(output).toContain("Vivarium Daemon Smoke");
    expect(output).toContain("Usage: vivarium daemon smoke");
    expect(output).toContain("--status-url <url>");
    expect(output).toContain("Defaults to http://127.0.0.1:8787/status.");
    expect(output).toContain("vivarium daemon smoke");
    expect(output).toContain("vivarium daemon smoke --status-url http://127.0.0.1:8787/status");
    expect(output).toContain("vivarium launch handoff");
    expect(output).not.toContain("Commands");
  });
});
