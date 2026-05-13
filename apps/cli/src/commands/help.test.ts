import { describe, expect, test } from "bun:test";

import { helpCommand, renderHelpCommandResult } from "./help.js";

describe("helpCommand", () => {
  test("renders branded first-run command help", () => {
    const result = helpCommand();
    const output = renderHelpCommandResult(result);
    const firstRunBlock = output.slice(output.indexOf("First run"), output.indexOf("Commands"));

    expect(result.commands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ command: "vivarium setup" }),
        expect.objectContaining({ command: 'vivarium run --goal "validate local setup"' }),
        expect.objectContaining({ command: "vivarium status" }),
        expect.objectContaining({ command: "vivarium doctor" }),
        expect.objectContaining({ command: "vivarium model" }),
        expect.objectContaining({ command: "vivarium live env-init --path live-readiness.local.env" }),
        expect.objectContaining({ command: "vivarium setup --env-file live-readiness.local.env" }),
        expect.objectContaining({
          command: "vivarium setup --env-file live-readiness.local.env --confirm-write",
        }),
        expect.objectContaining({ command: "vivarium live evidence-init --path v1-evidence.json" }),
        expect.objectContaining({ command: "vivarium update" }),
      ]),
    );
    expect(output).toContain("Vivarium Agent");
    expect(output).toContain('.-""""-.');
    expect(output).toContain("First run");
    expect(output).toContain("vivarium setup");
    expect(output).toContain('vivarium run --goal "validate local setup"');
    expect(output).toContain("vivarium live env-init");
    expect(output).toContain("vivarium setup --env-file live-readiness.local.env");
    expect(output).toContain("vivarium setup --env-file live-readiness.local.env --confirm-write");
    expect(output).toContain("vivarium live evidence-init");
    expect(output).toContain("vivarium model");
    expect(output).toContain("vivarium help");
    expect(firstRunBlock).toContain(
      "vivarium run --goal \"validate local setup\" --state-path .vivarium/state.db",
    );
    expect(firstRunBlock).toContain(
      "vivarium setup --env-file live-readiness.local.env --domain coding --world-root ../the-world --state-path .vivarium/state.db",
    );
    expect(firstRunBlock).toContain(
      "vivarium setup --env-file live-readiness.local.env --domain coding --world-root ../the-world --state-path .vivarium/state.db --confirm-write",
    );
    expect(firstRunBlock).toContain("vivarium model --env-file live-readiness.local.env");
    expect(firstRunBlock).toContain("vivarium doctor --live --env-file live-readiness.local.env");
    expect(firstRunBlock).not.toContain("  vivarium doctor                                     Check readiness.");
    expect(firstRunBlock).not.toContain("  vivarium model                                      Show provider setup.");
    const liveEnvInitRow = output
      .split("\n")
      .find((line) => line.includes("Create a private live setup env file."));
    expect(liveEnvInitRow).toMatch(/live-readiness\.local\.env\s{2,}Create/);
    const liveSetupConfirmRow = output
      .split("\n")
      .find((line) => line.includes("Write live setup files after reviewing the dry run."));
    expect(liveSetupConfirmRow).toMatch(/--confirm-write\s{2,}Write/);
    const liveEvidenceInitRow = output
      .split("\n")
      .find((line) => line.includes("Create a live evidence manifest skeleton."));
    expect(liveEvidenceInitRow).toMatch(/v1-evidence\.json\s{2,}Create/);
  });
});
