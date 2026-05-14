import { describe, expect, test } from "bun:test";

import { launchHandoffCommand, renderLaunchHandoffCommandResult } from "./launch.js";

describe("launchHandoffCommand", () => {
  test("renders the commit-pinned Mac install script and branch-pinned checkout handoff", () => {
    const result = launchHandoffCommand();
    const output = renderLaunchHandoffCommandResult(result);

    expect(result.installCommand).toContain(
      "https://raw.githubusercontent.com/idanmann10/vivarium-agent/c6c6778f1024f19294d24219b02c7778566e5b04/scripts/install.sh",
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
    expect(output).toContain("non-author reviewer with write or admin access for PR #22");
    expect(output).toContain("real provider keys/smokes");
    expect(output).toContain("two-week improvement evidence");
    expect(output).toContain("Why those keys exist:");
    expect(output).toContain("Provider keys prove real Anthropic, OpenRouter, and private model calls.");
    expect(output).toContain("Credential keys prove the encrypted internal API smoke path.");
    expect(output).toContain("Evidence refs prove the real v1 behavior loop instead of local-only demos.");
    expect(output).toContain("Owner next action:");
    expect(output).toContain("Ask a non-author reviewer with write or admin access to approve PR #22.");
    expect(output).toContain("GitHub rejects author self-approval: Review Can not approve your own pull request.");
    expect(output).toContain(
      "gh api -X PUT repos/idanmann10/vivarium-agent/collaborators/<github-username> -f permission=push",
    );
    expect(output).toContain("gh pr edit 22 --repo idanmann10/vivarium-agent --add-reviewer <github-username>");
    expect(output).toContain(
      "Explicit owner admin bypass, if chosen: gh pr merge 22 --repo idanmann10/vivarium-agent --squash --admin --delete-branch=false",
    );
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
