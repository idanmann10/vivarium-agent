import { describe, expect, test } from "bun:test";

import { helpCommand, renderHelpCommandResult } from "./help.js";

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
          command: "vivarium daemon smoke --status-url http://127.0.0.1:8787/status",
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
    expect(output).toContain("vivarium daemon smoke --status-url http://127.0.0.1:8787/status");
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
});
