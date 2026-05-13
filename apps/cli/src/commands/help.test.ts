import { describe, expect, test } from "bun:test";

import { helpCommand, renderHelpCommandResult } from "./help.js";

describe("helpCommand", () => {
  test("renders branded first-run command help", () => {
    const result = helpCommand();
    const output = renderHelpCommandResult(result);

    expect(result.commands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ command: "vivarium setup" }),
        expect.objectContaining({ command: "vivarium status" }),
        expect.objectContaining({ command: "vivarium doctor" }),
        expect.objectContaining({ command: "vivarium model" }),
        expect.objectContaining({ command: "vivarium live env-init --path live-readiness.local.env" }),
        expect.objectContaining({ command: "vivarium update" }),
      ]),
    );
    expect(output).toContain("Vivarium Agent");
    expect(output).toContain('.-""""-.');
    expect(output).toContain("First run");
    expect(output).toContain("vivarium setup");
    expect(output).toContain("vivarium live env-init");
    expect(output).toContain("vivarium model");
    expect(output).toContain("vivarium help");
    const liveEnvInitRow = output
      .split("\n")
      .find((line) => line.includes("Create a private live setup env file."));
    expect(liveEnvInitRow).toMatch(/live-readiness\.local\.env\s{2,}Create/);
  });
});
