import { renderVivariumGlobe } from "./branding.js";
import { listProviderProfilesCommand, type ProviderProfile } from "./providers.js";

export type ModelCommandProblem =
  | "missing_profiles_path"
  | "no_profiles"
  | "missing_expected_profiles"
  | "missing_profile_secrets"
  | "invalid_profiles";

export type ModelSecretStatus = "configured" | "missing" | "placeholder";

export type ModelProfileSummary = Pick<
  ProviderProfile,
  "name" | "kind" | "apiKeyEnv" | "model" | "baseUrl" | "capabilities" | "contextWindow" | "costClass"
> & {
  readonly secretStatus: ModelSecretStatus;
};

export interface ModelCommandOptions {
  readonly profilesPath?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
}

export interface ModelCommandResult {
  readonly ok: boolean;
  readonly profilesPath?: string;
  readonly profiles: readonly ModelProfileSummary[];
  readonly expectedProfiles?: readonly string[];
  readonly missingProfiles?: readonly string[];
  readonly missingSecretProfiles?: readonly string[];
  readonly problem?: ModelCommandProblem;
  readonly error?: string;
}

function shellQuote(value: string): string {
  return /^[A-Za-z0-9_./:-]+$/.test(value) ? value : JSON.stringify(value);
}

function isDefaultLiveEnvFile(envFilePath: string): boolean {
  return (
    envFilePath === "live-readiness.local.env" ||
    envFilePath.endsWith("/.vivarium/live/live-readiness.local.env")
  );
}

function connectCommand(envFilePath: string): string {
  return isDefaultLiveEnvFile(envFilePath)
    ? "vivarium connect"
    : `vivarium connect --env-file ${envFilePath}`;
}

function connectFillCommand(envFilePath: string): string {
  return isDefaultLiveEnvFile(envFilePath)
    ? "vivarium connect fill"
    : `vivarium connect fill --env-file ${envFilePath}`;
}

function connectSetupCommand(envFilePath: string): string {
  return isDefaultLiveEnvFile(envFilePath)
    ? "vivarium connect setup --confirm-write"
    : `vivarium connect setup --env-file ${envFilePath} --confirm-write`;
}

function modelCommandLine(envFilePath: string): string {
  return isDefaultLiveEnvFile(envFilePath)
    ? "vivarium model"
    : `vivarium model --env-file ${envFilePath}`;
}

function envProfilesPath(env: Readonly<Record<string, string | undefined>>): string | undefined {
  const value = env.VIVARIUM_PROVIDER_PROFILES_PATH?.trim();
  return value === undefined || value.length === 0 ? undefined : value;
}

function envProfileName(env: Readonly<Record<string, string | undefined>>, name: string): string | undefined {
  const value = env[name]?.trim();
  return value === undefined || value.length === 0 || /^<[^>]+>$/.test(value) ? undefined : value;
}

function isPlaceholderValue(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length === 0 || /^<[^>]+>$/.test(trimmed) || /^replace[-_ ]me$/i.test(trimmed);
}

function expectedProfiles(env: Readonly<Record<string, string | undefined>>): readonly string[] {
  return [
    envProfileName(env, "VIVARIUM_ANTHROPIC_PROVIDER_PROFILE"),
    envProfileName(env, "VIVARIUM_OPENROUTER_PROVIDER_PROFILE"),
    envProfileName(env, "VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE"),
  ].filter((value): value is string => value !== undefined);
}

function profileSecretStatus(
  profile: ProviderProfile,
  env: Readonly<Record<string, string | undefined>>,
): ModelSecretStatus {
  const value = env[profile.apiKeyEnv];
  if (value === undefined) {
    return "missing";
  }
  return isPlaceholderValue(value) ? "placeholder" : "configured";
}

function profileSummary(profile: ProviderProfile, env: Readonly<Record<string, string | undefined>>): ModelProfileSummary {
  return {
    name: profile.name,
    kind: profile.kind,
    apiKeyEnv: profile.apiKeyEnv,
    secretStatus: profileSecretStatus(profile, env),
    model: profile.model,
    ...(profile.baseUrl === undefined ? {} : { baseUrl: profile.baseUrl }),
    capabilities: profile.capabilities,
    contextWindow: profile.contextWindow,
    costClass: profile.costClass,
  };
}

export function modelCommand(options: ModelCommandOptions = {}): ModelCommandResult {
  const env = options.env ?? process.env;
  const profilesPath = options.profilesPath ?? envProfilesPath(env);
  const expected = expectedProfiles(env);
  if (profilesPath === undefined) {
    return { ok: false, profiles: [], problem: "missing_profiles_path" };
  }

  try {
    const profiles = listProviderProfilesCommand({ profilesPath }).profiles.map((profile) => profileSummary(profile, env));
    if (profiles.length === 0) {
      return { ok: false, profilesPath, profiles, problem: "no_profiles" };
    }

    const profileNames = new Set(profiles.map((profile) => profile.name));
    const missingProfiles = expected.filter((profile) => !profileNames.has(profile));
    if (missingProfiles.length > 0) {
      return {
        ok: false,
        profilesPath,
        profiles,
        expectedProfiles: expected,
        missingProfiles,
        problem: "missing_expected_profiles",
      };
    }

    const missingSecretProfiles = profiles
      .filter((profile) => profile.secretStatus !== "configured")
      .map((profile) => profile.name);
    if (missingSecretProfiles.length > 0) {
      return {
        ok: false,
        profilesPath,
        profiles,
        expectedProfiles: expected,
        missingSecretProfiles,
        problem: "missing_profile_secrets",
      };
    }

    return expected.length === 0
      ? { ok: true, profilesPath, profiles }
      : { ok: true, profilesPath, profiles, expectedProfiles: expected };
  } catch (error) {
    return {
      ok: false,
      profilesPath,
      profiles: [],
      problem: "invalid_profiles",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

interface RenderModelCommandOptions {
  readonly envFilePath?: string;
  readonly showDetails?: boolean;
}

function renderModelProfile(
  profile: ModelProfileSummary,
  options: RenderModelCommandOptions,
): readonly string[] {
  const secretLine =
    options.showDetails === true
      ? `       Env: ${profile.apiKeyEnv} (${profile.secretStatus})`
      : `       Secret: ${renderSecretStatus(profile.secretStatus)}`;
  return [
    `  [${profile.secretStatus === "configured" ? "ok" : "needs"}] ${profile.name}`,
    `       Kind: ${profile.kind}`,
    `       Model: ${profile.model}`,
    ...(profile.baseUrl === undefined ? [] : [`       Base URL: ${profile.baseUrl}`]),
    secretLine,
    `       Context: ${profile.contextWindow}`,
    `       Cost: ${profile.costClass}`,
    `       Capabilities: ${profile.capabilities.join(", ")}`,
  ];
}

function renderSecretStatus(status: ModelSecretStatus): string {
  if (status === "configured") {
    return "configured by environment";
  }
  if (status === "placeholder") {
    return "placeholder provider key";
  }
  return "missing provider key";
}

function renderModelGuidance(
  result: ModelCommandResult,
  options: { readonly envFilePath?: string; readonly showDetails?: boolean },
): readonly string[] {
  const envFilePath = shellQuote(options.envFilePath ?? "live-readiness.local.env");

  if (result.problem === "invalid_profiles") {
    return [
      "Next steps:",
      `  Fix the provider profile file: ${result.profilesPath}`,
      ...(result.error === undefined ? [] : [`  Error: ${result.error}`]),
      "  Guide: docs/guides/configure-providers.md",
    ];
  }

  if (result.problem === "no_profiles") {
    return [
      "Next steps:",
      `  No provider profiles found at: ${result.profilesPath}`,
      "  Fill common provider values through the setup helper:",
      `  ${connectFillCommand(envFilePath)}`,
      "  Then write the guarded setup files:",
      `  ${connectSetupCommand(envFilePath)}`,
      ...(options.showDetails === true
        ? ["  Or add one profile with: vivarium providers configure ..."]
        : []),
      "  Guide: docs/guides/configure-providers.md",
    ];
  }

  return [
    "Next steps:",
    "  Start guided live setup:",
    "  vivarium setup live",
    "  Review and fill provider values:",
    `  ${connectCommand(envFilePath)}`,
    `  ${connectFillCommand(envFilePath)}`,
    "  Then write the provider profiles:",
    `  ${connectSetupCommand(envFilePath)}`,
    `  Then inspect provider readiness: ${modelCommandLine(envFilePath)}`,
    "  Manual override: pass --profiles-path <path>.",
    "  Guide: docs/guides/configure-providers.md",
  ];
}

function renderMissingProfiles(
  result: ModelCommandResult,
  options: { readonly envFilePath?: string },
): readonly string[] {
  const envFilePath = shellQuote(options.envFilePath ?? "live-readiness.local.env");

  if (result.problem !== "missing_expected_profiles" || result.missingProfiles === undefined) {
    return [];
  }

  return [
    "",
    "Missing expected profiles:",
    ...result.missingProfiles.map((profile) => `  [fix] ${profile}`),
    "",
    "Next steps:",
    "  Fill the missing provider values through the setup helper:",
    `  ${connectFillCommand(envFilePath)}`,
    "  Then re-run guarded setup:",
    `  ${connectSetupCommand(envFilePath)}`,
    `  Then inspect again: ${modelCommandLine(envFilePath)}`,
  ];
}

function renderMissingProfileSecrets(
  result: ModelCommandResult,
  options: { readonly envFilePath?: string; readonly showDetails?: boolean },
): readonly string[] {
  const envFilePath = shellQuote(options.envFilePath ?? "live-readiness.local.env");

  if (result.problem !== "missing_profile_secrets" || result.missingSecretProfiles === undefined) {
    return [];
  }

  return [
    "",
    "Provider secrets need attention:",
    ...result.missingSecretProfiles.map((profile) => `  [fix] ${profile}`),
    "",
    "Next steps:",
    "  Fill provider keys through the setup helper:",
    `  ${connectFillCommand(envFilePath)}`,
    "  Then re-run guarded setup:",
    `  ${connectSetupCommand(envFilePath)}`,
    "  Then run live smoke tests:",
    "  vivarium connect smoke",
    ...(options.showDetails === true ? ["  Or smoke one profile with: vivarium providers smoke ..."] : []),
  ];
}

export function renderModelCommandResult(
  result: ModelCommandResult,
  options: RenderModelCommandOptions = {},
): string {
  const hiddenProfileDetails = result.profiles.length > 0 && options.showDetails !== true;
  const hiddenSetupDetails = result.profiles.length === 0 && options.showDetails !== true;
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Model",
    "--------------",
    `Status: ${result.ok ? "configured" : "needs setup"}`,
    `Profiles path: ${result.profilesPath ?? "not set"}`,
    "",
    ...(result.profiles.length > 0
      ? [
          "Profiles:",
          ...result.profiles.flatMap((profile) => renderModelProfile(profile, options)),
          ...renderMissingProfiles(result, options),
          ...renderMissingProfileSecrets(result, options),
        ]
      : renderModelGuidance(result, options)),
    ...(hiddenProfileDetails || hiddenSetupDetails
      ? [
          "",
          "Details:",
          hiddenProfileDetails
            ? "  Re-run with --details to show exact provider secret env names."
            : "  Re-run with --details to show low-level provider profile commands.",
        ]
      : []),
    "",
  ].join("\n");
}
