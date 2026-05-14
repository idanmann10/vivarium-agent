import { describe, expect, test } from "bun:test";

import { launchHandoffCommand, renderLaunchHandoffCommandResult } from "./launch.js";

describe("launchHandoffCommand", () => {
  test("renders the branch-pinned Mac install handoff and production boundary", () => {
    const result = launchHandoffCommand();
    const output = renderLaunchHandoffCommandResult(result);

    expect(result.installCommand).toContain(
      "https://raw.githubusercontent.com/idanmann10/vivarium-agent/codex/hermes-style-quick-setup/scripts/install.sh",
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
