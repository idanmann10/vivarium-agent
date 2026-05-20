import { existsSync, statfsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
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
const minimumSetupDiskBytes = 256 * 1024 * 1024;

export interface SetupDiskSpace {
  readonly path: string;
  readonly availableBytes: number;
  readonly minimumBytes: number;
}

export type SetupDiskSpaceProbe = (path: string) => SetupDiskSpace;

export interface SetupCommandOptions {
  readonly primaryDomain: string;
  readonly agentName?: string;
  readonly worldRoot?: string;
  readonly statePath?: string;
  readonly envFilePath?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly confirmWrite?: boolean;
  readonly quick?: boolean;
  readonly liveEnvPath?: string;
  readonly dashboardUrl?: string;
  readonly prefill?: LiveEnvPrefillOptions;
  readonly diskSpaceProbe?: SetupDiskSpaceProbe;
  readonly simpleLocalRunNextCommand?: boolean;
}

export interface SetupCommandResult {
  readonly ok: boolean;
  readonly local: InitCommandResult;
  readonly live?: LiveSetupCommandResult;
  readonly quickEnv?: LiveEnvInitCommandResult;
  readonly liveEnvFilePath: string;
  readonly dashboardUrl?: string;
  readonly dashboardOpen?: {
    readonly ok: boolean;
    readonly error?: string;
  };
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
  const liveRunPath = quickEnv?.path ?? options.liveEnvPath ?? options.envFilePath;
  const explicitRunCommand = commandWithFlags("local run", {
    domain: options.primaryDomain,
    "agent-name": options.agentName,
    "state-path": local.statePath,
    "world-root": local.worldRoot,
    "live-env-path": liveRunPath,
  });
  const runCommand = options.simpleLocalRunNextCommand === true ? "vivarium local run" : explicitRunCommand;
  const liveEnvFilePath = options.envFilePath ?? quickEnv?.path ?? defaultLiveEnvFilePath;
  const modelCommand = commandWithFlags("model", { "env-file": liveEnvFilePath });
  const smokeCommand = commandWithFlags("connect smoke", { "env-file": liveEnvFilePath });
  const proofCommand = commandWithFlags("proof", { "env-file": liveEnvFilePath });
  const doctorCommand = commandWithFlags("doctor", { live: true, "env-file": liveEnvFilePath });

  if (options.dashboardUrl !== undefined) {
    return [
      runCommand,
      "vivarium dashboard --open",
      "vivarium daemon smoke",
      "vivarium status",
      "vivarium tools",
      "vivarium help",
      "vivarium update",
    ];
  }

  if (options.envFilePath !== undefined && live?.ok === true) {
    return [runCommand, modelCommand, smokeCommand, proofCommand, doctorCommand];
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
      smokeCommand,
      proofCommand,
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
      smokeCommand,
      proofCommand,
      doctorCommand,
    ];
  }

  if (quickEnv !== undefined) {
    return [
      runCommand,
      "vivarium launch handoff",
      "vivarium status",
      "vivarium tools",
      "vivarium help",
      "vivarium update",
    ];
  }

  return [
    runCommand,
    "vivarium launch handoff",
    "vivarium status",
    "vivarium tools",
    "vivarium help",
    "vivarium update",
  ];
}

function isExistingLiveEnv(result: LiveEnvInitCommandResult): boolean {
  return result.ok === false && result.error.includes("already exists");
}

function bytes(value: number): string {
  if (value < 1024 * 1024) {
    return `${Math.max(0, Math.floor(value / 1024))} KiB`;
  }
  return `${Math.max(0, Math.floor(value / (1024 * 1024)))} MiB`;
}

function defaultStatePath(): string {
  return join(process.env.HOME ?? homedir(), ".vivarium", "state.db");
}

function existingProbePath(path: string): string {
  let current = resolve(path);
  while (!existsSync(current)) {
    const parent = dirname(current);
    if (parent === current) {
      return process.cwd();
    }
    current = parent;
  }
  return current;
}

function defaultDiskSpaceProbe(path: string): SetupDiskSpace {
  const probePath = existingProbePath(path);
  const stats = statfsSync(probePath);
  return {
    path: probePath,
    availableBytes: Number(stats.bavail) * Number(stats.bsize),
    minimumBytes: minimumSetupDiskBytes,
  };
}

function assertSetupDiskSpace(options: SetupCommandOptions): void {
  const statePath = options.statePath ?? defaultStatePath();
  const probePath = dirname(statePath);
  const disk = (options.diskSpaceProbe ?? defaultDiskSpaceProbe)(probePath);
  if (disk.availableBytes >= disk.minimumBytes) {
    return;
  }

  throw new Error(
    [
      `Not enough free disk space for Vivarium setup at ${disk.path}.`,
      `${bytes(disk.availableBytes)} available; ${bytes(disk.minimumBytes)} required.`,
      "Free disk space or choose a --state-path on a volume with more space.",
    ].join(" "),
  );
}

export function setupCommand(options: SetupCommandOptions): SetupCommandResult {
  assertSetupDiskSpace(options);
  const local = runInitCommand({
    primaryDomain: options.primaryDomain,
    bindGithubIdentity: false,
    ...(options.agentName === undefined ? {} : { agentName: options.agentName }),
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
  const liveEnvFilePath = options.envFilePath ?? quickEnv?.path ?? defaultLiveEnvFilePath;
  return {
    ok:
      live === undefined
        ? quickEnv === undefined || quickEnv.ok || isExistingLiveEnv(quickEnv)
        : live.ok,
    local,
    ...(live === undefined ? {} : { live }),
    ...(quickEnv === undefined ? {} : { quickEnv }),
    liveEnvFilePath,
    ...(options.dashboardUrl === undefined ? {} : { dashboardUrl: options.dashboardUrl }),
    nextCommands: setupNextCommands(options, local, live, quickEnv),
  };
}

function renderQuickEnvSummary(
  quickEnv: LiveEnvInitCommandResult | undefined,
  options: { readonly showLiveHandoff?: boolean } = {},
): readonly string[] {
  const showLiveHandoff = options.showLiveHandoff ?? true;
  if (quickEnv === undefined) {
    return [];
  }

  if (quickEnv.ok) {
    return [
      "Local setup is ready now.",
      "Live readiness: staged for later",
      `Readiness file: ${quickEnv.path}`,
      `Permissions: ${quickEnv.mode}`,
      ...(quickEnv.prefilled.length === 0 ? [] : [`Prefilled: ${quickEnv.prefilled.join(", ")}`]),
      ...(showLiveHandoff
        ? ["Use vivarium launch handoff when you are ready for provider keys and live evidence."]
        : []),
    ];
  }

  if (isExistingLiveEnv(quickEnv)) {
    return [
      "Local setup is ready now.",
      "Live readiness: already staged",
      `Readiness file: ${quickEnv.path}`,
      ...(showLiveHandoff
        ? ["Use vivarium launch handoff when you are ready for provider keys and live evidence."]
        : []),
    ];
  }

  return [
    "Live readiness: blocked",
    `Readiness file: ${quickEnv.path}`,
    `Error: ${quickEnv.error}`,
  ];
}

const liveUnlockGroups = [
  {
    label: "Provider profiles",
    keys: new Set([
      "VIVARIUM_PROVIDER_PROFILES_PATH",
      "VIVARIUM_ANTHROPIC_PROVIDER_PROFILE",
      "VIVARIUM_OPENROUTER_PROVIDER_PROFILE",
      "VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE",
    ]),
  },
  {
    label: "Provider keys/models",
    keys: new Set([
      "ANTHROPIC_API_KEY",
      "VIVARIUM_ANTHROPIC_MODEL",
      "VIVARIUM_ANTHROPIC_CONTEXT_WINDOW",
      "OPENROUTER_API_KEY",
      "VIVARIUM_OPENROUTER_MODEL",
      "VIVARIUM_OPENROUTER_BASE_URL",
      "VIVARIUM_OPENROUTER_CONTEXT_WINDOW",
      "VIVARIUM_OAI_COMPAT_API_KEY",
      "VIVARIUM_OAI_COMPAT_MODEL",
      "VIVARIUM_OAI_COMPAT_BASE_URL",
      "VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW",
    ]),
  },
  {
    label: "Encrypted credentials/internal API",
    keys: new Set([
      "VIVARIUM_CREDENTIALS_PATH",
      "VIVARIUM_CREDENTIALS_MASTER_KEY",
      "VIVARIUM_INTERNAL_API_CREDENTIAL_NAME",
      "VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE",
      "VIVARIUM_INTERNAL_API_HEALTH_URL",
    ]),
  },
  {
    label: "GitHub/public release",
    keys: new Set([
      "GITHUB_TOKEN",
      "GH_TOKEN",
      "VIVARIUM_GITHUB_OWNER",
      "VIVARIUM_AGENT_REPO_NAME",
      "VIVARIUM_WORLD_REPO_NAME",
      "VIVARIUM_CANONICAL_WORLD_REF",
      "VIVARIUM_PRIVATE_WORLD_REF",
      "VIVARIUM_GITHUB_REPOSITORY_ID",
      "VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID",
    ]),
  },
] as const;

function renderLiveUnlockValues(
  heading: string,
  values: readonly string[] | undefined,
): readonly string[] {
  if (values === undefined || values.length === 0) {
    return [];
  }

  const grouped = liveUnlockGroups.flatMap(({ label, keys }) => {
    const groupValues = values.filter((value) => keys.has(value));
    return groupValues.length === 0
      ? []
      : [`  ${label}:`, ...groupValues.map((value) => `    ${value}`)];
  });
  const knownKeys = new Set(liveUnlockGroups.flatMap(({ keys }) => [...keys]));
  const otherValues = values.filter((value) => !knownKeys.has(value));

  return [
    heading,
    ...grouped,
    ...(otherValues.length === 0
      ? []
      : ["  Other:", ...otherValues.map((value) => `    ${value}`)]),
  ];
}

function renderLiveSummary(
  live: LiveSetupCommandResult | undefined,
  envFilePath: string,
): readonly string[] {
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
    `Fill live settings: edit ${envFilePath} locally. Keep it out of git.`,
    "Production unlock needs provider keys/models, provider profiles, encrypted credentials, and an internal health URL.",
    "Guide: docs/guides/live-readiness.md#operator-unlock-key-map",
    "Unlock key types:",
    "  Safe metadata: repo names, GitHub node IDs, model names, base URLs, context windows",
    "  Secrets: provider API keys, GitHub token, credential master key, internal API token",
    "  Evidence paths: provider profiles, encrypted credential store, v1 evidence manifest",
    ...renderLiveUnlockValues("Missing keys by unlock area:", live.missing),
    ...renderLiveUnlockValues("Placeholder keys by unlock area:", live.placeholders),
    ...renderLiveUnlockValues("Invalid keys by unlock area:", live.invalid),
  ];
}

export function renderSetupCommandResult(result: SetupCommandResult): string {
  const lines = [
    renderVivariumGlobe(),
    "",
    "Vivarium Setup",
    "--------------",
    `Agent: ${result.local.agentName}`,
    `Local state initialized: ${result.local.statePath}`,
    `Domain: ${result.local.primaryDomain}`,
    `Starter skills: ${result.local.starterSkills.length}`,
    `Starter traces: ${result.local.starterTraces.length}`,
    ...(result.quickEnv === undefined
      ? renderLiveSummary(result.live, result.liveEnvFilePath)
      : renderQuickEnvSummary(result.quickEnv, { showLiveHandoff: result.dashboardUrl === undefined })),
    ...(result.dashboardUrl === undefined
      ? []
      : [
          `Dashboard: ${result.dashboardUrl}`,
          `Status JSON: ${result.dashboardUrl.replace(/\/$/, "")}/status`,
          ...(result.dashboardOpen === undefined
            ? []
            : [
                result.dashboardOpen.ok
                  ? `Opened: ${result.dashboardUrl}`
                  : "Open: blocked",
                ...(result.dashboardOpen.error === undefined
                  ? []
                  : [`Error: ${result.dashboardOpen.error}`]),
              ]),
        ]),
    "",
    ...renderLaunchSequence(result.nextCommands, { heading: "Next commands:" }),
    "",
  ];
  return `${lines.join("\n")}\n`;
}
