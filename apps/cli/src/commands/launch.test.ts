import { describe, expect, test } from "bun:test";

import { launchHandoffCommand, renderLaunchHandoffCommandResult } from "./launch.js";

describe("launchHandoffCommand", () => {
  test("renders the commit-pinned Mac install script and branch-pinned checkout handoff", () => {
    const result = launchHandoffCommand();
    const output = renderLaunchHandoffCommandResult(result);

    expect(result.installCommand).toContain(
      "https://raw.githubusercontent.com/idanmann10/vivarium-agent/340f7340e5937da79872dfb30d975300f7b2e89a/scripts/install.sh",
    );
    expect(result.installCommand).toContain("VIVARIUM_AGENT_REF=codex/hermes-style-quick-setup");
    expect(result.installCommand).toContain("VIVARIUM_DAEMON=launchd");
    expect(output).toContain("Vivarium Launch Handoff");
    expect(output).toContain("Mac install command:");
    expect(output).toContain("vivarium run --goal \"validate local setup\"");
    expect(output).toContain("vivarium daemon smoke --status-url http://127.0.0.1:8787/status");
    expect(output).toContain("vivarium setup --env-file live-readiness.local.env");
    expect(output).toContain("Production boundary:");
    expect(output).toContain("Local Mac install/deploy is ready for reviewer/operator use.");
    expect(output).toContain("Full v1 live production readiness is still blocked");
    expect(output).toContain("Required unblock:");
    expect(output).toContain("eligible non-author reviewer");
    expect(output).toContain("real provider keys/smokes");
    expect(output).toContain("two-week improvement evidence");
    expect(output).toContain("Why those keys exist:");
    expect(output).toContain("Provider keys prove real Anthropic, OpenRouter, and private model calls.");
    expect(output).toContain("Credential keys prove the encrypted internal API smoke path.");
    expect(output).toContain("Evidence refs prove the real v1 behavior loop instead of local-only demos.");
    expect(output).toContain("Owner next action:");
    expect(output).toContain("Ask an eligible non-author reviewer to approve PR #22.");
    expect(output).toContain("Do not lower branch protection to merge this PR.");
    expect(output).toContain("After PR #22 merges, switch the install command to the main branch.");
  });

  test("renders the stable main install command without a branch ref override", () => {
    const result = launchHandoffCommand({ ref: "main" });
    const output = renderLaunchHandoffCommandResult(result);

    expect(result.installCommand).toBe(
      "curl -fsSL https://raw.githubusercontent.com/idanmann10/vivarium-agent/main/scripts/install.sh | VIVARIUM_DAEMON=launchd bash",
    );
    expect(output).not.toContain("VIVARIUM_AGENT_REF=main");
  });
});
