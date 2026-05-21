import { describe, expect, test } from "bun:test";

import { renderToolsCommandResult, toolsCommand } from "./tools.js";

describe("toolsCommand", () => {
  test("renders a read-only external tool and safety dashboard", () => {
    const result = toolsCommand();
    const output = renderToolsCommandResult(result);

    expect(result.toolsets).toEqual([
      "web",
      "file",
      "terminal",
      "code",
      "http",
      "mcp",
      "anthropic-native",
      "computer-use",
    ]);
    expect(result.defaultPolicyAction).toBe("approve unless configured otherwise");
    expect(output).toContain("Vivarium Tools");
    expect(output).toContain("VIVARIUM // local memory // world culture");
    expect(output).toContain("Read-only dashboard");
    expect(output).toContain("External toolsets");
    expect(output).toContain("[toolset] terminal");
    expect(output).toContain("terminal.run");
    expect(output).toContain("file.read");
    expect(output).toContain("http.request");
    expect(output).toContain("computer.click");
    expect(output).toContain("Safety defaults");
    expect(output).toContain("Tool policies: approve unless configured otherwise");
    expect(output).toContain("Credential-like arguments: blocked before adapter dispatch");
    expect(output).toContain("Computer click/type: confirmation for system-level targets and password fields");
    expect(output).toContain("Terminal policy examples");
    expect(output).toContain("commandPrefix: git status");
    expect(output).toContain("git status && rm -rf build");
    expect(output).toContain("Next commands");
    expect(output).toContain("vivarium help");
    expect(output).toContain("vivarium model");
    expect(output).toContain("vivarium connect");
    expect(output).not.toContain("provider-secret");
    expect(output).not.toContain("API_KEY=");
  });
});
