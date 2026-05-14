import { describe, expect, test } from "bun:test";

import { launchHandoffCommand, renderLaunchHandoffCommandResult } from "./launch.js";

describe("launchHandoffCommand", () => {
  test("renders the stable main Mac install handoff", () => {
    const result = launchHandoffCommand();
    const output = renderLaunchHandoffCommandResult(result);

    expect(result.installCommand).toBe(
      "curl -fsSL https://raw.githubusercontent.com/idanmann10/vivarium-agent/main/scripts/install.sh | VIVARIUM_DAEMON=launchd bash",
    );
    expect(result.installCommand).not.toContain("VIVARIUM_AGENT_REF=");
    expect(output).toContain("Vivarium Launch Handoff");
    expect(output).toContain("Mac install command:");
    expect(output).toContain("vivarium run --goal \"validate local setup\"");
    expect(output).toContain("vivarium daemon smoke --status-url http://127.0.0.1:8787/status");
    expect(output).toContain("vivarium setup --env-file live-readiness.local.env");
    expect(output).toContain("Production boundary:");
    expect(output).toContain("Local Mac install/deploy is ready for reviewer/operator use.");
    expect(output).toContain("Full v1 live production readiness is still blocked");
    expect(output).toContain("Required unblock:");
    expect(output).toContain("real provider keys/smokes");
    expect(output).toContain("two-week improvement evidence");
    expect(output).toContain("Why those keys exist:");
    expect(output).toContain("Provider keys prove real Anthropic, OpenRouter, and private model calls.");
    expect(output).toContain("Credential keys prove the encrypted internal API smoke path.");
    expect(output).toContain("Evidence refs prove the real v1 behavior loop instead of local-only demos.");
    expect(output).toContain("Owner next action:");
    expect(output).toContain("Run the stable main install command above for local Mac setup.");
    expect(output).toContain("Do not claim full v1 live readiness until doctor --live reports ready.");
  });

  test("renders a branch-pinned install command when explicitly requested", () => {
    const result = launchHandoffCommand({
      ref: "codex/hermes-style-quick-setup",
      scriptRef: "c6c6778f1024f19294d24219b02c7778566e5b04",
    });
    const output = renderLaunchHandoffCommandResult(result);

    expect(result.installCommand).toContain(
      "https://raw.githubusercontent.com/idanmann10/vivarium-agent/c6c6778f1024f19294d24219b02c7778566e5b04/scripts/install.sh",
    );
    expect(result.installCommand).toContain("VIVARIUM_AGENT_REF=codex/hermes-style-quick-setup");
    expect(output).toContain("VIVARIUM_DAEMON=launchd");
  });
});
