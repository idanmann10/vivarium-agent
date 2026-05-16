import { renderVivariumGlobe } from "./branding.js";
import { listProviderProfilesCommand, type ProviderProfile } from "./providers.js";

export type ModelCommandProblem =
  | "missing_profiles_path"
  | "no_profiles"
  | "missing_expected_profiles"
  | "invalid_profiles";

export type ModelProfileSummary = Pick<
  ProviderProfile,
  | "name"
  | "kind"
  | "apiKeyEnv"
  | "model"
  | "baseUrl"
  | "capabilities"
  | "contextWindow"
  | "costClass"
>;

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

function expectedProfiles(env: Readonly<Record<string, string | undefined>>): readonly string[] {
  return [
    envProfileName(env, "VIVARIUM_ANTHROPIC_PROVIDER_PROFILE"),
    envProfileName(env, "VIVARIUM_OPENROUTER_PROVIDER_PROFILE"),
    envProfileName(env, "VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE"),
  ].filter((value): value is string => value !== undefined);
}

function profileSummary(profile: ProviderProfile): ModelProfileSummary {
  return {
    name: profile.name,
    kind: profile.kind,
    apiKeyEnv: profile.apiKeyEnv,
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
    const profiles = listProviderProfilesCommand({ profilesPath }).profiles.map(profileSummary);
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
  return [
    `  [ok] ${profile.name}`,
    `       Kind: ${profile.kind}`,
    `       Model: ${profile.model}`,
    ...(profile.baseUrl === undefined ? [] : [`       Base URL: ${profile.baseUrl}`]),
    options.showDetails === true
      ? `       Env: ${profile.apiKeyEnv}`
      : "       Secret: configured by provider profile",
    `       Context: ${profile.contextWindow}`,
    `       Cost: ${profile.costClass}`,
    `       Capabilities: ${profile.capabilities.join(", ")}`,
  ];
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
    `  Then inspect configured models: ${modelCommandLine(envFilePath)}`,
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
