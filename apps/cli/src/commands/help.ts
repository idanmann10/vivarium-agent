import { renderVivariumGlobe } from "./branding.js";
import { renderLaunchSequence } from "./launch-sequence.js";

export interface HelpCommandItem {
  readonly command: string;
  readonly description: string;
}

export interface HelpCommandResult {
  readonly commands: readonly HelpCommandItem[];
}

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
      { command: "vivarium model", description: "Show configured provider profiles." },
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

export function renderHelpCommandResult(result: HelpCommandResult): string {
  const commandWidth = Math.max(52, ...result.commands.map((item) => item.command.length)) + 2;
  const rows = result.commands.map((item) => `  ${item.command.padEnd(commandWidth)}${item.description}`);
  const firstRunCommands = [
    "vivarium local",
    'vivarium local run --goal "build a tiny local agent"',
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
