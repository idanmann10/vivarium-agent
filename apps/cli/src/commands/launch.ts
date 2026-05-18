import { renderVivariumGlobe } from "./branding.js";
import { renderLaunchSequence } from "./launch-sequence.js";

export interface LaunchHandoffCommandOptions {
  readonly owner?: string;
  readonly repo?: string;
  readonly ref?: string;
  readonly scriptRef?: string;
  readonly daemonHost?: string;
  readonly daemonPort?: string;
  readonly reviewPrNumber?: string;
  readonly reviewerUsername?: string;
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
const defaultDaemonHost = "127.0.0.1";
const defaultDaemonPort = "8787";

function shellValue(value: string): string {
  return /^[A-Za-z0-9_./:-]+$/.test(value) ? value : JSON.stringify(value);
}

function installerFlags(ref: string, daemonHost: string, daemonPort: string): readonly string[] {
  return [
    ...(ref === defaultRef ? [] : ["--ref", shellValue(ref)]),
    "--daemon",
    "launchd",
    ...(daemonHost === defaultDaemonHost ? [] : ["--daemon-host", shellValue(daemonHost)]),
    ...(daemonPort === defaultDaemonPort ? [] : ["--daemon-port", shellValue(daemonPort)]),
  ];
}

function installCommand(
  owner: string,
  repo: string,
  ref: string,
  scriptRef: string,
  daemonHost: string,
  daemonPort: string,
): string {
  const scriptUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${scriptRef}/scripts/install.sh`;
  return `curl -fsSL ${scriptUrl} | bash -s -- ${installerFlags(ref, daemonHost, daemonPort).join(" ")}`;
}

function daemonSmokeCommand(daemonHost: string, daemonPort: string): string {
  if (daemonHost === defaultDaemonHost && daemonPort === defaultDaemonPort) {
    return "vivarium daemon smoke";
  }

  return `vivarium daemon smoke --status-url http://${daemonHost}:${daemonPort}/status`;
}

export function launchHandoffCommand(
  options: LaunchHandoffCommandOptions = {},
): LaunchHandoffCommandResult {
  const owner = options.owner ?? defaultOwner;
  const repo = options.repo ?? defaultRepo;
  const ref = options.ref ?? defaultRef;
  const scriptRef = options.scriptRef ?? (ref === defaultRef ? defaultScriptRef : ref);
  const daemonHost = options.daemonHost ?? defaultDaemonHost;
  const daemonPort = options.daemonPort ?? defaultDaemonPort;
  const reviewPrNumber = options.reviewPrNumber ?? "PR_NUMBER";
  const reviewerUsername = options.reviewerUsername ?? "REVIEWER_GITHUB_USERNAME";

  return {
    installCommand: installCommand(owner, repo, ref, scriptRef, daemonHost, daemonPort),
    postInstallCommands: [
      "vivarium local run",
      daemonSmokeCommand(daemonHost, daemonPort),
      "vivarium status",
      "vivarium tools",
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
      ref === defaultRef
        ? "Run the stable main install command above, then run the local agent commands."
        : "Run the branch-pinned install command above, then run the local agent commands.",
      ...(ref === defaultRef
        ? []
        : [
            "Keep branch protection and review intact before switching installs back to main.",
            "Invite one eligible non-author reviewer when GitHub reports REVIEW_REQUIRED.",
            `gh pr view ${reviewPrNumber} --repo ${owner}/${repo} --json reviewDecision,mergeStateStatus,reviewRequests`,
            `gh api repos/${owner}/${repo}/collaborators --jq '.[].login'`,
            `gh api -X PUT repos/${owner}/${repo}/collaborators/${reviewerUsername} -f permission=push`,
            `gh pr edit ${reviewPrNumber} --repo ${owner}/${repo} --add-reviewer ${reviewerUsername}`,
            "If the collaborator list only shows the PR author, the reviewer must accept the invite before the review request can satisfy branch protection.",
            "Do not lower branch protection or self-approve just to merge.",
          ]),
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
