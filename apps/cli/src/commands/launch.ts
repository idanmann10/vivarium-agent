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
  readonly liveVerificationCommands: readonly string[];
  readonly requiredUnblocks: readonly string[];
  readonly keyExplanations: readonly string[];
  readonly ownerNextActions: readonly string[];
}

const defaultOwner = "idanmann10";
const defaultRepo = "vivarium-agent";
const defaultRef = "main";
const defaultScriptRef = "main";

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
      'vivarium local run --goal "build a tiny local agent"',
      "vivarium daemon smoke --status-url http://127.0.0.1:8787/status",
      "vivarium status",
      "vivarium help",
      "vivarium update",
    ],
    liveVerificationCommands: [
      "vivarium setup live",
      "vivarium connect signup",
      "vivarium connect",
      "vivarium connect fill",
      "vivarium connect setup --confirm-write",
      "vivarium model",
      "vivarium connect smoke",
      "vivarium proof init",
      "vivarium proof",
      "vivarium doctor --live",
    ],
    requiredUnblocks: [
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
      "Run the stable main install command above, then run the local agent commands.",
      "Use the live verification commands only after secrets and evidence are available.",
      "Do not claim full v1 live readiness until doctor --live reports ready.",
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
    "When ready for live verification:",
    ...renderLaunchSequence(result.liveVerificationCommands),
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
