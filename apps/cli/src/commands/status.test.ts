import { describe, expect, test } from "bun:test";

import { renderStatusCommandResult, statusCommand } from "./status.js";

describe("statusCommand", () => {
  test("renders branded local runtime status", () => {
    const result = statusCommand();
    const output = renderStatusCommandResult(result);

    expect(result).toEqual({ repo: "the-agent", runtime: "offline-local" });
    expect(output).toContain("Vivarium Status");
    expect(output).toContain("VIVARIUM // local memory // world culture");
    expect(output).toContain("Repository: the-agent");
    expect(output).toContain("Runtime: offline-local");
    expect(output).toContain("vivarium setup");
    expect(output).toContain("vivarium doctor");
    expect(output).toContain("vivarium help");
  });
});
