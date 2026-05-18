import { renderVivariumGlobe } from "./branding.js";
import { renderLaunchSequence } from "./launch-sequence.js";

export interface HelpCommandItem {
  readonly command: string;
  readonly description: string;
}

export interface HelpCommandResult {
  readonly commands: readonly HelpCommandItem[];
}

export interface FocusedHelpCommandResult {
  readonly title: string;
  readonly underline: string;
  readonly usage: string;
  readonly options: readonly HelpCommandItem[];
  readonly examples: readonly string[];
  readonly nextCommands: readonly string[];
}

export type LocalRunHelpCommandResult = FocusedHelpCommandResult;
export type LocalSetupHelpCommandResult = FocusedHelpCommandResult;
export type SetupHelpCommandResult = FocusedHelpCommandResult;
export type StatusHelpCommandResult = FocusedHelpCommandResult;
export type LaunchHandoffHelpCommandResult = FocusedHelpCommandResult;
export type DaemonSmokeHelpCommandResult = FocusedHelpCommandResult;
export type ConnectFillHelpCommandResult = FocusedHelpCommandResult;
export type ConnectSetupHelpCommandResult = FocusedHelpCommandResult;
export type ConnectSmokeHelpCommandResult = FocusedHelpCommandResult;
export type ProofInitHelpCommandResult = FocusedHelpCommandResult;
export type GithubSmokeHelpCommandResult = FocusedHelpCommandResult;

export function helpCommand(): HelpCommandResult {
  return {
    commands: [
      { command: "vivarium --setup", description: "Set up local memory and show the localhost dashboard path." },
      { command: "vivarium start", description: "Start guided local setup with the starter pack." },
      { command: "vivarium local", description: "Create the default local agent and starter memory." },
      { command: "vivarium local run", description: "Run the local agent offline with the built-in provider." },
      { command: "vivarium dashboard", description: "Show the local daemon dashboard URL." },
      { command: "vivarium onboard", description: "Run local onboarding with the starter pack." },
      {
        command: "vivarium setup live",
        description: "Run the full live setup wizard with private default files.",
      },
      {
        command: "vivarium onboard live",
        description: "Alias for the live setup wizard.",
      },
      { command: "vivarium setup", description: "Initialize local state and starter world." },
      { command: "vivarium status", description: "Show local and production readiness status." },
      { command: "vivarium doctor", description: "Run offline readiness checks." },
      { command: "vivarium connect", description: "Show provider signup and live setup guidance." },
      { command: "vivarium model", description: "Show provider profile readiness." },
      { command: "vivarium tools", description: "Show external toolsets and safety policy posture." },
      {
        command: "vivarium connect wizard",
        description: "Custom-path live setup for advanced operators.",
      },
      {
        command: "vivarium connect init",
        description: "Lower-level setup file creation for custom paths.",
      },
      {
        command: "vivarium connect signup",
        description: "Show account links and the local value map.",
      },
      {
        command: "vivarium connect fill",
        description: "Fill common live setup values, paths, and names by friendly labels.",
      },
      {
        command: "vivarium connect setup --confirm-write",
        description: "Write live setup files after reviewing readiness.",
      },
      {
        command: "vivarium connect smoke",
        description: "Run guided provider and credential smoke checks.",
      },
      {
        command: "vivarium proof init",
        description: "Create the v1 evidence manifest from the setup file.",
      },
      {
        command: "vivarium proof",
        description: "Review the v1 evidence checklist without raw manifest keys.",
      },
      {
        command: "vivarium daemon smoke",
        description: "Verify the Mac LaunchAgent daemon.",
      },
      {
        command: "vivarium launch handoff",
        description: "Show the Mac install command and production boundary.",
      },
      {
        command: "vivarium update",
        description: "Pull the latest agent and refresh dependencies.",
      },
      {
        command: "vivarium world search --domain coding --query <query>",
        description: "Search world knowledge.",
      },
      { command: "vivarium help", description: "Show this command guide." },
    ],
  };
}

export function localRunHelpCommand(): LocalRunHelpCommandResult {
  return {
    title: "Vivarium Local Run",
    underline: "------------------",
    usage: "vivarium local run",
    options: [
      {
        command: "--goal <text>",
        description: 'Goal to run. Defaults to "build a simple agent end to end".',
      },
      {
        command: "--domain <name>",
        description: "Skill and trace domain to use. Defaults to coding.",
      },
      {
        command: "--state-path <path>",
        description: "SQLite memory path to write and later inspect with vivarium status.",
      },
      {
        command: "--world-root <path>",
        description: "Local world checkout to read starter skills and traces from.",
      },
      {
        command: "--live-env-path <path>",
        description: "Live-readiness file to stage and report in status output.",
      },
      {
        command: "--env-file <path>",
        description: "Load provider profiles and key env values from a live-readiness file.",
      },
      {
        command: "--provider-profile <name>",
        description: "Saved provider profile to use after live provider setup is ready.",
      },
      {
        command: "--available-tool <name>",
        description: "Advertise an optional tool as available to retrieval and planning.",
      },
    ],
    examples: [
      "vivarium local run",
      'vivarium local run --goal "summarize this repo" --state-path ./vivarium-state.db --live-env-path ./live-readiness.local.env',
      'vivarium local run --goal "try a live model" --env-file ~/.vivarium/live/live-readiness.local.env --provider-profile openrouter',
    ],
    nextCommands: ["vivarium status", "vivarium launch handoff", "vivarium model"],
  };
}

export function localSetupHelpCommand(): LocalSetupHelpCommandResult {
  return {
    title: "Vivarium Local Setup",
    underline: "--------------------",
    usage: "vivarium local",
    options: [
      {
        command: "--domain <name>",
        description: "Primary starter domain to install. Defaults to coding.",
      },
      {
        command: "--agent-name <name>",
        description: "Local agent identity to create. Defaults to local-agent.",
      },
      {
        command: "--state-path <path>",
        description: "SQLite memory path to initialize and reuse for runs.",
      },
      {
        command: "--world-root <path>",
        description: "Local world checkout to install starter skills and traces from.",
      },
      {
        command: "--live-env-path <path>",
        description: "Private live-readiness file to stage for later provider setup.",
      },
      {
        command: "--github-owner <name>",
        description: "Prefill non-secret GitHub owner metadata in the staged setup file.",
      },
    ],
    examples: [
      "vivarium local",
      "vivarium local --domain research",
    ],
    nextCommands: [
      "vivarium local run",
      "vivarium status",
      "vivarium launch handoff",
    ],
  };
}

export function setupHelpCommand(): SetupHelpCommandResult {
  return {
    title: "Vivarium Setup",
    underline: "--------------",
    usage: "vivarium setup",
    options: [
      {
        command: "--domain <name>",
        description: "Primary starter domain to install. Defaults to coding.",
      },
      {
        command: "--state-path <path>",
        description: "SQLite memory path to initialize and reuse for runs.",
      },
      {
        command: "--world-root <path>",
        description: "Local world checkout to install starter skills and traces from.",
      },
      {
        command: "--live-env-path <path>",
        description: "Private live-readiness file to stage for later provider setup.",
      },
      {
        command: "--env-file <path>",
        description: "Filled live-readiness file to materialize provider and credential setup.",
      },
      {
        command: "--confirm-write",
        description: "Write generated live setup files after reviewing the setup dashboard.",
      },
    ],
    examples: [
      "vivarium setup",
      "vivarium setup live",
      "vivarium setup --domain research",
      "vivarium setup --env-file ~/.vivarium/live/live-readiness.local.env --confirm-write",
    ],
    nextCommands: [
      "vivarium local run",
      "vivarium setup live",
      "vivarium connect",
      "vivarium doctor --live",
    ],
  };
}

export function statusHelpCommand(): StatusHelpCommandResult {
  return {
    title: "Vivarium Status",
    underline: "---------------",
    usage: "vivarium status",
    options: [
      {
        command: "--state-path <path>",
        description: "SQLite memory path to inspect for local state and latest run proof.",
      },
      {
        command: "--live-env-path <path>",
        description: "Live-readiness file to report as missing, staged, or ready.",
      },
    ],
    examples: [
      "vivarium status",
      "vivarium status --state-path ./vivarium-state.db --live-env-path ./live-readiness.local.env",
    ],
    nextCommands: [
      "vivarium local run",
      "vivarium proof",
      "vivarium doctor --live",
      "vivarium launch handoff",
    ],
  };
}

export function launchHandoffHelpCommand(): LaunchHandoffHelpCommandResult {
  return {
    title: "Vivarium Launch Handoff",
    underline: "-----------------------",
    usage: "vivarium launch handoff",
    options: [
      {
        command: "--ref <branch-or-tag-or-commit>",
        description: "Agent checkout ref to install. Defaults to main, or the current pre-main branch.",
      },
      {
        command: "--script-ref <commit-or-tag>",
        description: "Installer script ref to fetch. Defaults to the current checkout commit on pre-main branches.",
      },
      {
        command: "--daemon-host <host>",
        description: "Mac LaunchAgent host used in the daemon smoke command. Defaults to 127.0.0.1.",
      },
      {
        command: "--daemon-port <port>",
        description: "Mac LaunchAgent port used in install and smoke commands. Defaults to 8787.",
      },
      {
        command: "--pr-number <number>",
        description: "PR number to use when rendering exact required-review commands.",
      },
      {
        command: "--reviewer <github-username>",
        description: "Eligible non-author reviewer username to use in invite and review-request commands.",
      },
    ],
    examples: [
      "vivarium launch handoff",
      "vivarium launch handoff --ref main",
      "vivarium launch handoff --pr-number 26 --reviewer REVIEWER_GITHUB_USERNAME",
    ],
    nextCommands: ["vivarium local run", "vivarium daemon smoke", "vivarium proof", "vivarium doctor --live"],
  };
}

export function daemonSmokeHelpCommand(): DaemonSmokeHelpCommandResult {
  return {
    title: "Vivarium Daemon Smoke",
    underline: "---------------------",
    usage: "vivarium daemon smoke",
    options: [
      {
        command: "--status-url <url>",
        description: "Daemon status endpoint to verify. Defaults to http://127.0.0.1:8787/status.",
      },
    ],
    examples: [
      "vivarium daemon smoke",
      "vivarium daemon smoke --status-url http://127.0.0.1:8787/status",
    ],
    nextCommands: ["vivarium launch handoff", "vivarium status", "vivarium doctor --live"],
  };
}

export function connectFillHelpCommand(): ConnectFillHelpCommandResult {
  return {
    title: "Vivarium Connect Fill",
    underline: "----------------------",
    usage: "vivarium connect fill",
    options: [
      {
        command: "--env-file <path>",
        description: "Private live-readiness file to update. Defaults to ~/.vivarium/live/live-readiness.local.env.",
      },
      {
        command: "--secrets-dir <path>",
        description: "Read generated local setup files from one private directory.",
      },
      {
        command: "--setup-dir <path>",
        description: "Fill generated provider profile, credential store, and evidence paths.",
      },
      {
        command: "--anthropic-key-file <path>",
        description: "Read the Anthropic API key from a private local file.",
      },
      {
        command: "--openrouter-key-file <path>",
        description: "Read the OpenRouter API key from a private local file.",
      },
      {
        command: "--private-base-url-file <path>",
        description: "Read the private OpenAI-compatible base URL from a local file.",
      },
      {
        command: "--private-model-file <path>",
        description: "Read the private OpenAI-compatible model name from a local file.",
      },
      {
        command: "--private-context-window-file <path>",
        description: "Read the private model context window from a local file.",
      },
      {
        command: "--internal-token-file <path>",
        description: "Read the internal API credential value from a private local file.",
      },
      {
        command: "--internal-health-url-file <path>",
        description: "Read the internal API health-check URL from a local file.",
      },
      {
        command: "--credential-master-key-file <path>",
        description: "Read the local credential-store master key from a private file.",
      },
    ],
    examples: [
      "vivarium connect fill --secrets-dir ~/.vivarium/secrets --setup-dir ~/.vivarium/live",
      "vivarium connect fill --private-base-url-file ~/.vivarium/secrets/private-base-url.txt --private-model-file ~/.vivarium/secrets/private-model.txt",
    ],
    nextCommands: ["vivarium connect", "vivarium connect setup --confirm-write", "vivarium connect smoke"],
  };
}

export function connectSetupHelpCommand(): ConnectSetupHelpCommandResult {
  return {
    title: "Vivarium Connect Setup",
    underline: "-----------------------",
    usage: "vivarium connect setup --confirm-write",
    options: [
      {
        command: "--env-file <path>",
        description: "Private live-readiness file to read. Defaults to ~/.vivarium/live/live-readiness.local.env.",
      },
      {
        command: "--confirm-write",
        description: "Write provider profiles, encrypted credentials, and the evidence manifest skeleton.",
      },
      {
        command: "--details",
        description: "Show exact setup fields and lower-level commands when troubleshooting.",
      },
    ],
    examples: [
      "vivarium connect setup",
      "vivarium connect setup --confirm-write",
      "vivarium connect setup --env-file ~/.vivarium/live/live-readiness.local.env --confirm-write",
    ],
    nextCommands: ["vivarium connect smoke", "vivarium proof init", "vivarium doctor --live"],
  };
}

export function connectSmokeHelpCommand(): ConnectSmokeHelpCommandResult {
  return {
    title: "Vivarium Connect Smoke",
    underline: "-----------------------",
    usage: "vivarium connect smoke",
    options: [
      {
        command: "--env-file <path>",
        description: "Private live-readiness file with saved provider profiles and credential paths.",
      },
      {
        command: "--details",
        description: "Show exact lower-level provider and credential smoke commands.",
      },
    ],
    examples: [
      "vivarium connect smoke",
      "vivarium connect smoke --env-file ~/.vivarium/live/live-readiness.local.env",
      "vivarium connect smoke --details",
    ],
    nextCommands: ["vivarium proof", "vivarium doctor --live", "vivarium model"],
  };
}

export function proofInitHelpCommand(): ProofInitHelpCommandResult {
  return {
    title: "Vivarium Proof Init",
    underline: "-------------------",
    usage: "vivarium proof init",
    options: [
      {
        command: "--env-file <path>",
        description: "Private live-readiness file that points at the v1 evidence manifest.",
      },
      {
        command: "--overwrite",
        description: "Replace an existing manifest skeleton after reviewing the current evidence.",
      },
      {
        command: "--details",
        description: "Show exact evidence path and manifest wiring.",
      },
    ],
    examples: [
      "vivarium proof init",
      "vivarium proof init --env-file ~/.vivarium/live/live-readiness.local.env",
    ],
    nextCommands: ["vivarium proof", "vivarium doctor --live", "vivarium connect smoke"],
  };
}

export function githubSmokeHelpCommand(): GithubSmokeHelpCommandResult {
  return {
    title: "Vivarium GitHub Smoke",
    underline: "---------------------",
    usage: "vivarium github smoke",
    options: [
      {
        command: "--target <agent|world>",
        description: "Use saved agent or world repository metadata. Defaults to world.",
      },
      {
        command: "--owner <name>",
        description: "Override the saved GitHub owner for this smoke.",
      },
      {
        command: "--repo <name>",
        description: "Override the saved GitHub repository for this smoke.",
      },
      {
        command: "--token-env <name>",
        description: "Environment variable that contains the GitHub token. Defaults to GITHUB_TOKEN.",
      },
    ],
    examples: [
      "vivarium github smoke",
      "vivarium github smoke --target agent",
      "vivarium github smoke --owner idanmann10 --repo vivarium-world",
    ],
    nextCommands: [
      "vivarium github workflow-runs",
      "vivarium github discussion --confirm-write",
      "vivarium doctor --live",
    ],
  };
}

export function renderHelpCommandResult(result: HelpCommandResult): string {
  const commandWidth = Math.max(52, ...result.commands.map((item) => item.command.length)) + 2;
  const rows = result.commands.map((item) => `  ${item.command.padEnd(commandWidth)}${item.description}`);
  const firstRunCommands = [
    "vivarium --setup",
    "vivarium local run",
    "vivarium dashboard",
    "vivarium daemon smoke",
    "vivarium status",
    "vivarium help",
    "vivarium update",
  ];

  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Agent",
    "--------------",
    "",
    "First run",
    ...renderLaunchSequence(firstRunCommands),
    "",
    "Commands",
    ...rows,
    "",
  ].join("\n");
}

export function renderLocalRunHelpCommandResult(result: LocalRunHelpCommandResult): string {
  return renderFocusedHelpCommandResult(result);
}

export function renderLocalSetupHelpCommandResult(result: LocalSetupHelpCommandResult): string {
  return renderFocusedHelpCommandResult(result);
}

export function renderSetupHelpCommandResult(result: SetupHelpCommandResult): string {
  return renderFocusedHelpCommandResult(result);
}

export function renderStatusHelpCommandResult(result: StatusHelpCommandResult): string {
  return renderFocusedHelpCommandResult(result);
}

export function renderLaunchHandoffHelpCommandResult(result: LaunchHandoffHelpCommandResult): string {
  return renderFocusedHelpCommandResult(result);
}

export function renderDaemonSmokeHelpCommandResult(result: DaemonSmokeHelpCommandResult): string {
  return renderFocusedHelpCommandResult(result);
}

export function renderConnectFillHelpCommandResult(result: ConnectFillHelpCommandResult): string {
  return renderFocusedHelpCommandResult(result);
}

export function renderConnectSetupHelpCommandResult(result: ConnectSetupHelpCommandResult): string {
  return renderFocusedHelpCommandResult(result);
}

export function renderConnectSmokeHelpCommandResult(result: ConnectSmokeHelpCommandResult): string {
  return renderFocusedHelpCommandResult(result);
}

export function renderProofInitHelpCommandResult(result: ProofInitHelpCommandResult): string {
  return renderFocusedHelpCommandResult(result);
}

export function renderGithubSmokeHelpCommandResult(result: GithubSmokeHelpCommandResult): string {
  return renderFocusedHelpCommandResult(result);
}

function renderFocusedHelpCommandResult(result: FocusedHelpCommandResult): string {
  const optionWidth = Math.max(...result.options.map((item) => item.command.length)) + 2;
  return [
    renderVivariumGlobe(),
    "",
    result.title,
    result.underline,
    "",
    `Usage: ${result.usage}`,
    "",
    "Options",
    ...result.options.map((item) => `  ${item.command.padEnd(optionWidth)}${item.description}`),
    "",
    "Examples",
    ...result.examples.map((example) => `  ${example}`),
    "",
    "Next",
    ...result.nextCommands.map((command) => `  ${command}`),
    "",
  ].join("\n");
}
