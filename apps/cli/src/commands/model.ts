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

function renderModelProfile(profile: ModelProfileSummary): readonly string[] {
  return [
    `  [ok] ${profile.name}`,
    `       Kind: ${profile.kind}`,
    `       Model: ${profile.model}`,
    ...(profile.baseUrl === undefined ? [] : [`       Base URL: ${profile.baseUrl}`]),
    `       Env: ${profile.apiKeyEnv}`,
    `       Context: ${profile.contextWindow}`,
    `       Cost: ${profile.costClass}`,
    `       Capabilities: ${profile.capabilities.join(", ")}`,
  ];
}

function renderModelGuidance(
  result: ModelCommandResult,
  options: { readonly envFilePath?: string },
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
      `  Fill ${envFilePath}, then write the guarded setup files:`,
      `  vivarium live setup --env-file ${envFilePath} --confirm-write`,
      "  Or add one profile with: vivarium providers configure ...",
      "  Guide: docs/guides/configure-providers.md",
    ];
  }

  return [
    "Next steps:",
    "  Set VIVARIUM_PROVIDER_PROFILES_PATH, pass --profiles-path <path>,",
    "  or load a readiness file:",
    `  vivarium model --env-file ${envFilePath}`,
    `  vivarium live setup --env-file ${envFilePath} --confirm-write`,
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
    `  Re-run guarded setup after filling ${envFilePath}:`,
    `  vivarium live setup --env-file ${envFilePath} --confirm-write`,
    `  Then inspect again: vivarium model --env-file ${envFilePath}`,
  ];
}

export function renderModelCommandResult(
  result: ModelCommandResult,
  options: { readonly envFilePath?: string } = {},
): string {
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Model",
    "--------------",
    `Status: ${result.ok ? "configured" : "needs setup"}`,
    `Profiles path: ${result.profilesPath ?? "not set"}`,
    "",
    ...(result.profiles.length > 0
      ? ["Profiles:", ...result.profiles.flatMap(renderModelProfile), ...renderMissingProfiles(result, options)]
      : renderModelGuidance(result, options)),
    "",
  ].join("\n");
}
