import { renderVivariumGlobe } from "./branding.js";

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
      { command: "vivarium setup", description: "Initialize local state and guided live setup." },
      { command: 'vivarium run --goal "validate local setup"', description: "Validate the local setup." },
      { command: "vivarium status", description: "Print the local runtime status." },
      { command: "vivarium doctor", description: "Run offline readiness checks." },
      { command: "vivarium model", description: "Show configured provider profiles." },
      {
        command: "vivarium live env-init --path live-readiness.local.env",
        description: "Create a private live setup env file.",
      },
      {
        command: "vivarium setup --env-file live-readiness.local.env",
        description: "Preview live setup writes.",
      },
      {
        command: "vivarium setup --env-file live-readiness.local.env --confirm-write",
        description: "Write live setup files after reviewing the dry run.",
      },
      {
        command: "vivarium live evidence-init --path v1-evidence.json",
        description: "Create a live evidence manifest skeleton.",
      },
      {
        command: "vivarium update",
        description: "Pull the latest agent and refresh dependencies.",
      },
      { command: "vivarium run --goal <goal>", description: "Run a local goal." },
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

  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Agent",
    "--------------",
    "",
    "First run",
    "  vivarium setup --domain coding --world-root ../the-world --state-path .vivarium/state.db",
    '  vivarium run --goal "validate local setup" --state-path .vivarium/state.db',
    "  vivarium live env-init --path live-readiness.local.env",
    "  vivarium setup --env-file live-readiness.local.env --domain coding --world-root ../the-world --state-path .vivarium/state.db",
    "  vivarium setup --env-file live-readiness.local.env --domain coding --world-root ../the-world --state-path .vivarium/state.db --confirm-write",
    "  vivarium model --env-file live-readiness.local.env",
    "  vivarium doctor --live --env-file live-readiness.local.env",
    "",
    "Commands",
    ...rows,
    "",
  ].join("\n");
}
