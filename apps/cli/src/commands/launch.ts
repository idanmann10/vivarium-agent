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
}

const defaultOwner = "idanmann10";
const defaultRepo = "vivarium-agent";
const defaultRef = "codex/hermes-style-quick-setup";
const defaultScriptRef = "340f7340e5937da79872dfb30d975300f7b2e89a";

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
      "eligible non-author reviewer for PR #22",
      "real provider keys/smokes for Anthropic, OpenRouter, and the private OpenAI-compatible provider",
      "encrypted internal credential smoke",
      "v1 evidence manifest with public contribution, published artifacts, curation stats, and two-week improvement evidence",
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
  ].join("\n");
}
