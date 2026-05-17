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
    expect(output).toContain(
      'vivarium local run --goal "build a tiny local agent" --state-path ~/.vivarium/state.db --world-root ~/.vivarium/the-world --live-env-path ~/.vivarium/live/live-readiness.local.env',
    );
    expect(output).not.toContain("vivarium run --goal \"validate local setup\"");
    expect(output).toContain("vivarium daemon smoke --status-url http://127.0.0.1:8787/status");
    expect(output).toContain("vivarium status");
    expect(output).toContain("vivarium help");
    expect(output).toContain("When ready for live verification:");
    expect(output).toContain("vivarium setup live");
    expect(output).toContain("vivarium connect signup");
    expect(output).toContain("vivarium connect");
    expect(output).toContain(
      [
        "      vivarium setup live",
        "      vivarium connect signup",
        "      vivarium connect",
        "      vivarium connect fill",
        "      vivarium connect setup --confirm-write",
      ].join("\n"),
    );
    expect(output).toContain("vivarium connect setup --confirm-write");
    expect(output).toContain("vivarium connect smoke");
    expect(output).toContain(
      [
        "  [4] Prepare live evidence",
        "      vivarium proof init",
        "      vivarium proof",
      ].join("\n"),
    );
    expect(output).toContain("vivarium proof");
    expect(output).not.toContain("vivarium live env-init --path live-readiness.local.env");
    expect(output).not.toContain("vivarium setup --env-file live-readiness.local.env");
    expect(output).not.toContain("vivarium live evidence-init --path v1-evidence.json");
    expect(output.slice(output.indexOf("After install:"), output.indexOf("When ready for live verification:"))).toContain(
      "--live-env-path ~/.vivarium/live/live-readiness.local.env",
    );
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
    expect(output).toContain("Run the stable main install command above, then run the local agent commands.");
    expect(output).not.toContain("Keep branch protection and review intact before switching installs back to main.");
    expect(output).toContain("Use the live verification commands only after secrets and evidence are available.");
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
    expect(output).toContain("Keep branch protection and review intact before switching installs back to main.");
    expect(output).toContain(
      "Invite one eligible non-author reviewer when GitHub reports REVIEW_REQUIRED.",
    );
    expect(output).toContain(
      "gh api -X PUT repos/idanmann10/vivarium-agent/collaborators/REVIEWER_GITHUB_USERNAME -f permission=push",
    );
    expect(output).toContain(
      "gh pr edit PR_NUMBER --repo idanmann10/vivarium-agent --add-reviewer REVIEWER_GITHUB_USERNAME",
    );
    expect(output).toContain("Do not lower branch protection or self-approve just to merge.");
  });

  test("renders custom daemon host and port in the launch handoff", () => {
    const result = launchHandoffCommand({
      daemonHost: "127.0.0.1",
      daemonPort: "9898",
    });
    const output = renderLaunchHandoffCommandResult(result);

    expect(result.installCommand).toBe(
      "curl -fsSL https://raw.githubusercontent.com/idanmann10/vivarium-agent/main/scripts/install.sh | VIVARIUM_DAEMON=launchd VIVARIUM_DAEMON_PORT=9898 bash",
    );
    expect(output).toContain("vivarium daemon smoke --status-url http://127.0.0.1:9898/status");
    expect(output).not.toContain("vivarium daemon smoke --status-url http://127.0.0.1:8787/status");
  });

  test("renders exact reviewer commands when reviewer and PR number are supplied", () => {
    const result = launchHandoffCommand({
      ref: "codex/local-agent-production-ready",
      scriptRef: "51dc4bd4dfa8de02ac2fe8a947ceb9d4066baa2a",
      reviewPrNumber: "26",
      reviewerUsername: "startclaw-ai",
    });
    const output = renderLaunchHandoffCommandResult(result);

    expect(output).toContain(
      "gh api -X PUT repos/idanmann10/vivarium-agent/collaborators/startclaw-ai -f permission=push",
    );
    expect(output).toContain(
      "gh pr edit 26 --repo idanmann10/vivarium-agent --add-reviewer startclaw-ai",
    );
    expect(output).not.toContain("PR_NUMBER");
    expect(output).not.toContain("REVIEWER_GITHUB_USERNAME");
  });
});
