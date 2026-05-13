import type { InitCommandResult } from "./init.js";
import { renderVivariumGlobe } from "./branding.js";
import { runInitCommand } from "./init.js";
import { renderLaunchSequence } from "./launch-sequence.js";
import type {
  LiveEnvInitCommandResult,
  LiveEnvPrefillOptions,
  LiveSetupCommandResult,
} from "./live.js";
import { liveEnvInitCommand, liveSetupCommand } from "./live.js";

const defaultLiveEnvFilePath = "live-readiness.local.env";

export interface SetupCommandOptions {
  readonly primaryDomain: string;
  readonly worldRoot?: string;
  readonly statePath?: string;
  readonly envFilePath?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly confirmWrite?: boolean;
  readonly quick?: boolean;
  readonly liveEnvPath?: string;
  readonly prefill?: LiveEnvPrefillOptions;
}

export interface SetupCommandResult {
  readonly ok: boolean;
  readonly local: InitCommandResult;
  readonly live?: LiveSetupCommandResult;
  readonly quickEnv?: LiveEnvInitCommandResult;
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
  quickEnv: LiveEnvInitCommandResult | undefined,
): readonly string[] {
  const runCommand = commandWithFlags("run", {
    goal: "validate local setup",
    domain: options.primaryDomain,
    "state-path": local.statePath,
    ...(options.worldRoot === undefined ? {} : { "world-root": options.worldRoot }),
  });
  const liveEnvFilePath = options.envFilePath ?? quickEnv?.path ?? defaultLiveEnvFilePath;
  const modelCommand = commandWithFlags("model", { "env-file": liveEnvFilePath });
  const evidenceCommand = commandWithFlags("live evidence-init", { path: "v1-evidence.json" });
  const doctorCommand = commandWithFlags("doctor", { live: true, "env-file": liveEnvFilePath });

  if (options.envFilePath !== undefined && live?.ok === true) {
    return [runCommand, modelCommand, evidenceCommand, doctorCommand];
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
      evidenceCommand,
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
      evidenceCommand,
      doctorCommand,
    ];
  }

  if (quickEnv !== undefined) {
    return [
      runCommand,
      commandWithFlags("setup", {
        "env-file": quickEnv.path,
        domain: options.primaryDomain,
        ...(options.worldRoot === undefined ? {} : { "world-root": options.worldRoot }),
        "state-path": local.statePath,
      }),
      commandWithFlags("setup", {
        "env-file": quickEnv.path,
        domain: options.primaryDomain,
        ...(options.worldRoot === undefined ? {} : { "world-root": options.worldRoot }),
        "state-path": local.statePath,
        "confirm-write": true,
      }),
      modelCommand,
      evidenceCommand,
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
    evidenceCommand,
    doctorCommand,
  ];
}

function isExistingLiveEnv(result: LiveEnvInitCommandResult): boolean {
  return result.ok === false && result.error.includes("already exists");
}

export function setupCommand(options: SetupCommandOptions): SetupCommandResult {
  const local = runInitCommand({
    primaryDomain: options.primaryDomain,
    bindGithubIdentity: false,
    ...(options.worldRoot === undefined ? {} : { worldRoot: options.worldRoot }),
    ...(options.statePath === undefined ? {} : { statePath: options.statePath }),
  });
  const quickEnv =
    options.quick === true && options.env === undefined
      ? liveEnvInitCommand({
          path: options.liveEnvPath ?? options.envFilePath ?? defaultLiveEnvFilePath,
          ...(options.prefill === undefined ? {} : { prefill: options.prefill }),
        })
      : undefined;
  const live =
    options.env === undefined
      ? undefined
      : liveSetupCommand({ env: options.env, confirmWrite: options.confirmWrite ?? false });
  return {
    ok:
      live === undefined
        ? quickEnv === undefined || quickEnv.ok || isExistingLiveEnv(quickEnv)
        : live.ok,
    local,
    ...(live === undefined ? {} : { live }),
    ...(quickEnv === undefined ? {} : { quickEnv }),
    nextCommands: setupNextCommands(options, local, live, quickEnv),
  };
}

function renderQuickEnvSummary(quickEnv: LiveEnvInitCommandResult | undefined): readonly string[] {
  if (quickEnv === undefined) {
    return [];
  }

  if (quickEnv.ok) {
    return [
      "Live env quick start: written",
      `Env file: ${quickEnv.path}`,
      `Permissions: ${quickEnv.mode}`,
      ...(quickEnv.prefilled.length === 0 ? [] : [`Prefilled: ${quickEnv.prefilled.join(", ")}`]),
      `Fill live settings: edit ${quickEnv.path} locally. Keep it out of git.`,
    ];
  }

  if (isExistingLiveEnv(quickEnv)) {
    return [
      "Live env quick start: already exists",
      `Env file: ${quickEnv.path}`,
      `Fill live settings: edit ${quickEnv.path} locally. Keep it out of git.`,
    ];
  }

  return [
    "Live env quick start: blocked",
    `Env file: ${quickEnv.path}`,
    `Error: ${quickEnv.error}`,
  ];
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
    ...(result.quickEnv === undefined
      ? renderLiveSummary(result.live)
      : renderQuickEnvSummary(result.quickEnv)),
    "",
    ...renderLaunchSequence(result.nextCommands, { heading: "Next commands:" }),
    "",
  ];
  return `${lines.join("\n")}\n`;
}
