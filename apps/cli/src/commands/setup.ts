import type { InitCommandResult } from "./init.js";
import { renderVivariumGlobe } from "./branding.js";
import { runInitCommand } from "./init.js";
import type { LiveSetupCommandResult } from "./live.js";
import { liveSetupCommand } from "./live.js";

const defaultLiveEnvFilePath = "live-readiness.local.env";

export interface SetupCommandOptions {
  readonly primaryDomain: string;
  readonly worldRoot?: string;
  readonly statePath?: string;
  readonly envFilePath?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly confirmWrite?: boolean;
}

export interface SetupCommandResult {
  readonly ok: boolean;
  readonly local: InitCommandResult;
  readonly live?: LiveSetupCommandResult;
  readonly nextCommands: readonly string[];
}

function shellQuote(value: string): string {
  return /^[A-Za-z0-9_./:-]+$/.test(value) ? value : JSON.stringify(value);
}

function commandWithFlags(
  command: string,
  flags: Readonly<Record<string, string | boolean | undefined>>,
): string {
  const args = Object.entries(flags).flatMap(([name, value]) => {
    if (value === undefined || value === false) {
      return [];
    }
    return value === true ? [`--${name}`] : [`--${name}`, shellQuote(value)];
  });
  return ["vivarium", command, ...args].join(" ");
}

function setupNextCommands(
  options: SetupCommandOptions,
  local: InitCommandResult,
  live: LiveSetupCommandResult | undefined,
): readonly string[] {
  const runCommand = commandWithFlags("run", {
    goal: "validate local setup",
    domain: options.primaryDomain,
    "state-path": local.statePath,
    ...(options.worldRoot === undefined ? {} : { "world-root": options.worldRoot }),
  });
  const liveEnvFilePath = options.envFilePath ?? defaultLiveEnvFilePath;
  const modelCommand = commandWithFlags("model", { "env-file": liveEnvFilePath });
  const doctorCommand = commandWithFlags("doctor", { live: true, "env-file": liveEnvFilePath });

  if (options.envFilePath !== undefined && live?.ok === true) {
    return [runCommand, modelCommand, doctorCommand];
  }

  if (
    options.envFilePath !== undefined &&
    live?.ok === false &&
    live.requiresConfirmation === true
  ) {
    return [
      runCommand,
      commandWithFlags("setup", {
        "env-file": options.envFilePath,
        domain: options.primaryDomain,
        ...(options.worldRoot === undefined ? {} : { "world-root": options.worldRoot }),
        "state-path": local.statePath,
        "confirm-write": true,
      }),
      modelCommand,
      doctorCommand,
    ];
  }

  if (options.envFilePath !== undefined && live?.ok === false) {
    return [
      runCommand,
      commandWithFlags("setup", {
        "env-file": options.envFilePath,
        domain: options.primaryDomain,
        ...(options.worldRoot === undefined ? {} : { "world-root": options.worldRoot }),
        "state-path": local.statePath,
      }),
      modelCommand,
      doctorCommand,
    ];
  }

  return [
    runCommand,
    commandWithFlags("live env-init", { path: defaultLiveEnvFilePath }),
    commandWithFlags("setup", {
      "env-file": defaultLiveEnvFilePath,
      domain: options.primaryDomain,
      ...(options.worldRoot === undefined ? {} : { "world-root": options.worldRoot }),
      "state-path": local.statePath,
    }),
    commandWithFlags("setup", {
      "env-file": defaultLiveEnvFilePath,
      domain: options.primaryDomain,
      ...(options.worldRoot === undefined ? {} : { "world-root": options.worldRoot }),
      "state-path": local.statePath,
      "confirm-write": true,
    }),
    modelCommand,
    doctorCommand,
  ];
}

export function setupCommand(options: SetupCommandOptions): SetupCommandResult {
  const local = runInitCommand({
    primaryDomain: options.primaryDomain,
    bindGithubIdentity: false,
    ...(options.worldRoot === undefined ? {} : { worldRoot: options.worldRoot }),
    ...(options.statePath === undefined ? {} : { statePath: options.statePath }),
  });
  const live =
    options.env === undefined
      ? undefined
      : liveSetupCommand({ env: options.env, confirmWrite: options.confirmWrite ?? false });
  return {
    ok: live === undefined ? true : live.ok,
    local,
    ...(live === undefined ? {} : { live }),
    nextCommands: setupNextCommands(options, local, live),
  };
}

function renderLiveSummary(live: LiveSetupCommandResult | undefined): readonly string[] {
  if (live === undefined) {
    return ["Live setup: env file not provided"];
  }

  if (live.ok) {
    return [
      "Live setup written",
      `Provider profiles: ${live.providerProfiles.join(", ")}`,
      `Credential: ${live.credentialName}`,
    ];
  }

  if (live.requiresConfirmation === true) {
    return [
      "Live setup dry run",
      `Provider profiles: ${live.providerProfiles?.join(", ") ?? "none"}`,
      `Credential: ${live.credentialName ?? "none"}`,
      "Re-run with --confirm-write to write provider profiles and encrypted credentials.",
    ];
  }

  return [
    "Live setup blocked",
    ...(live.missing === undefined ? [] : [`Missing: ${live.missing.join(", ")}`]),
    ...(live.placeholders === undefined ? [] : [`Placeholders: ${live.placeholders.join(", ")}`]),
    ...(live.invalid === undefined ? [] : [`Invalid: ${live.invalid.join(", ")}`]),
  ];
}

interface SetupCommandStage {
  readonly label: string;
  readonly matches: (command: string) => boolean;
}

const setupCommandStages: readonly SetupCommandStage[] = [
  {
    label: "Prove the local loop",
    matches: (command) => command.startsWith("vivarium run "),
  },
  {
    label: "Prepare live readiness",
    matches: (command) =>
      command.startsWith("vivarium live env-init ") || command.startsWith("vivarium setup "),
  },
  {
    label: "Inspect configured models",
    matches: (command) => command.startsWith("vivarium model"),
  },
  {
    label: "Run the readiness gate",
    matches: (command) => command.startsWith("vivarium doctor"),
  },
];

function renderNextCommands(commands: readonly string[]): readonly string[] {
  const remaining = [...commands];
  const lines = ["Next commands:"];
  let stageNumber = 1;

  for (const stage of setupCommandStages) {
    const stageCommands = remaining.filter(stage.matches);
    if (stageCommands.length === 0) {
      continue;
    }

    lines.push(`  [${stageNumber}] ${stage.label}`);
    lines.push(...stageCommands.map((command) => `      ${command}`));
    stageNumber += 1;

    for (const command of stageCommands) {
      const index = remaining.indexOf(command);
      if (index !== -1) {
        remaining.splice(index, 1);
      }
    }
  }

  if (remaining.length > 0) {
    lines.push(`  [${stageNumber}] Continue`);
    lines.push(...remaining.map((command) => `      ${command}`));
  }

  return lines;
}

export function renderSetupCommandResult(result: SetupCommandResult): string {
  const lines = [
    renderVivariumGlobe(),
    "",
    "Vivarium Setup",
    "--------------",
    `Local state initialized: ${result.local.statePath}`,
    `Domain: ${result.local.primaryDomain}`,
    `Starter skills: ${result.local.starterSkills.length}`,
    `Starter traces: ${result.local.starterTraces.length}`,
    ...renderLiveSummary(result.live),
    "",
    ...renderNextCommands(result.nextCommands),
    "",
  ];
  return `${lines.join("\n")}\n`;
}
