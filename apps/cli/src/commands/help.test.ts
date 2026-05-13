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
        expect.objectContaining({ command: "vivarium update" }),
      ]),
    );
    expect(output).toContain("Vivarium Agent");
    expect(output).toContain('.-""""-.');
    expect(output).toContain("First run");
    expect(output).toContain("vivarium setup");
    expect(output).toContain("vivarium model");
    expect(output).toContain("vivarium help");
  });
});
