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
export type StatusHelpCommandResult = FocusedHelpCommandResult;
export type LaunchHandoffHelpCommandResult = FocusedHelpCommandResult;

export function helpCommand(): HelpCommandResult {
  return {
    commands: [
      { command: "vivarium local", description: "Create the default local agent and starter memory." },
      { command: "vivarium local run", description: "Run the local agent offline with the built-in provider." },
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
        command: "vivarium daemon smoke --status-url http://127.0.0.1:8787/status",
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
    usage: 'vivarium local run --goal "build a simple agent end to end"',
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
      'vivarium local run --goal "build a simple agent end to end"',
      'vivarium local run --goal "summarize this repo" --state-path ~/.vivarium/state.db --live-env-path ~/.vivarium/live/live-readiness.local.env',
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
      "vivarium local --state-path ~/.vivarium/state.db --world-root ~/.vivarium/the-world --live-env-path ~/.vivarium/live/live-readiness.local.env",
    ],
    nextCommands: [
      'vivarium local run --goal "build a simple agent end to end"',
      "vivarium status",
      "vivarium launch handoff",
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
      "vivarium status --state-path ~/.vivarium/state.db --live-env-path ~/.vivarium/live/live-readiness.local.env",
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

export function renderHelpCommandResult(result: HelpCommandResult): string {
  const commandWidth = Math.max(52, ...result.commands.map((item) => item.command.length)) + 2;
  const rows = result.commands.map((item) => `  ${item.command.padEnd(commandWidth)}${item.description}`);
  const firstRunCommands = [
    "vivarium local",
    'vivarium local run --goal "build a simple agent end to end"',
    "vivarium launch handoff",
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

export function renderStatusHelpCommandResult(result: StatusHelpCommandResult): string {
  return renderFocusedHelpCommandResult(result);
}

export function renderLaunchHandoffHelpCommandResult(result: LaunchHandoffHelpCommandResult): string {
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
