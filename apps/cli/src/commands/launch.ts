import { renderVivariumGlobe } from "./branding.js";
import { renderLaunchSequence } from "./launch-sequence.js";

export interface LaunchHandoffCommandOptions {
  readonly owner?: string;
  readonly repo?: string;
  readonly ref?: string;
  readonly scriptRef?: string;
}

export interface LaunchHandoffCommandResult {
  readonly installCommand: string;
  readonly postInstallCommands: readonly string[];
  readonly requiredUnblocks: readonly string[];
  readonly keyExplanations: readonly string[];
  readonly ownerNextActions: readonly string[];
}

const defaultOwner = "idanmann10";
const defaultRepo = "vivarium-agent";
const defaultRef = "codex/hermes-style-quick-setup";
const defaultScriptRef = "c6c6778f1024f19294d24219b02c7778566e5b04";

function installCommand(owner: string, repo: string, ref: string, scriptRef: string): string {
  const scriptUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${scriptRef}/scripts/install.sh`;
  if (ref === "main") {
    return `curl -fsSL ${scriptUrl} | VIVARIUM_DAEMON=launchd bash`;
  }

  return [
    `curl -fsSL ${scriptUrl} | \\`,
    `  VIVARIUM_AGENT_REF=${ref} \\`,
    "  VIVARIUM_DAEMON=launchd \\",
    "  bash",
  ].join("\n");
}

export function launchHandoffCommand(
  options: LaunchHandoffCommandOptions = {},
): LaunchHandoffCommandResult {
  const owner = options.owner ?? defaultOwner;
  const repo = options.repo ?? defaultRepo;
  const ref = options.ref ?? defaultRef;
  const scriptRef = options.scriptRef ?? (ref === defaultRef ? defaultScriptRef : ref);

  return {
    installCommand: installCommand(owner, repo, ref, scriptRef),
    postInstallCommands: [
      'vivarium run --goal "validate local setup" --state-path .vivarium/state.db',
      "vivarium daemon smoke --status-url http://127.0.0.1:8787/status",
      "vivarium setup --env-file live-readiness.local.env --domain coding --world-root ~/.vivarium/the-world --state-path .vivarium/state.db",
      "vivarium doctor --live --env-file live-readiness.local.env",
    ],
    requiredUnblocks: [
      "non-author reviewer with write or admin access for PR #22",
      "real provider keys/smokes for Anthropic, OpenRouter, and the private OpenAI-compatible provider",
      "encrypted internal credential smoke",
      "v1 evidence manifest with public contribution, published artifacts, curation stats, and two-week improvement evidence",
    ],
    keyExplanations: [
      "Provider keys prove real Anthropic, OpenRouter, and private model calls.",
      "Credential keys prove the encrypted internal API smoke path.",
      "Evidence refs prove the real v1 behavior loop instead of local-only demos.",
      "GitHub IDs point checks at the public repos and Discussion category; they are not secrets.",
    ],
    ownerNextActions: [
      "Ask a non-author reviewer with write or admin access to approve PR #22.",
      "GitHub rejects author self-approval: Review Can not approve your own pull request.",
      "Add a reviewer with: gh api -X PUT repos/idanmann10/vivarium-agent/collaborators/<github-username> -f permission=push",
      "Request that reviewer with: gh pr edit 22 --repo idanmann10/vivarium-agent --add-reviewer <github-username>",
      "Explicit owner admin bypass, if chosen: gh pr merge 22 --repo idanmann10/vivarium-agent --squash --admin --delete-branch=false",
      "Do not lower branch protection to merge this PR.",
      "After secrets and evidence are available, rerun vivarium doctor --live --env-file live-readiness.local.env.",
      "After PR #22 merges, switch the install command to the main branch.",
    ],
  };
}

export function renderLaunchHandoffCommandResult(result: LaunchHandoffCommandResult): string {
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Launch Handoff",
    "-----------------------",
    "Mac install command:",
    result.installCommand,
    "",
    "After install:",
    ...renderLaunchSequence(result.postInstallCommands),
    "",
    "Production boundary:",
    "  Local Mac install/deploy is ready for reviewer/operator use.",
    "  Full v1 live production readiness is still blocked until the required unblocks are cleared.",
    "",
    "Required unblock:",
    ...result.requiredUnblocks.map((item) => `  - ${item}`),
    "",
    "Why those keys exist:",
    ...result.keyExplanations.map((item) => `  - ${item}`),
    "",
    "Owner next action:",
    ...result.ownerNextActions.map((item) => `  - ${item}`),
    "",
  ].join("\n");
}
