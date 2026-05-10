import { addCredentialCommand } from "./credentials.js";
import { configureProviderProfileCommand } from "./providers.js";

export interface LiveSetupCommandOptions {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly confirmWrite: boolean;
}

export type LiveSetupCommandResult =
  | {
      readonly ok: true;
      readonly written: true;
      readonly providerProfiles: readonly string[];
      readonly credentialName: string;
      readonly paths: {
        readonly providerProfilesPath: string;
        readonly credentialsPath: string;
      };
    }
  | {
      readonly ok: false;
      readonly written: false;
      readonly requiresConfirmation?: true;
      readonly wouldWrite?: readonly string[];
      readonly missing?: readonly string[];
      readonly placeholders?: readonly string[];
      readonly invalid?: readonly string[];
    };

const requiredEnvNames = [
  "VIVARIUM_PROVIDER_PROFILES_PATH",
  "ANTHROPIC_API_KEY",
  "VIVARIUM_ANTHROPIC_PROVIDER_PROFILE",
  "VIVARIUM_ANTHROPIC_MODEL",
  "VIVARIUM_ANTHROPIC_CONTEXT_WINDOW",
  "OPENROUTER_API_KEY",
  "VIVARIUM_OPENROUTER_PROVIDER_PROFILE",
  "VIVARIUM_OPENROUTER_MODEL",
  "VIVARIUM_OPENROUTER_BASE_URL",
  "VIVARIUM_OPENROUTER_CONTEXT_WINDOW",
  "VIVARIUM_OAI_COMPAT_API_KEY",
  "VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE",
  "VIVARIUM_OAI_COMPAT_MODEL",
  "VIVARIUM_OAI_COMPAT_BASE_URL",
  "VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW",
  "VIVARIUM_CREDENTIALS_PATH",
  "VIVARIUM_CREDENTIALS_MASTER_KEY",
  "VIVARIUM_INTERNAL_API_CREDENTIAL_NAME",
  "VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE",
] as const;

const integerEnvNames = [
  "VIVARIUM_ANTHROPIC_CONTEXT_WINDOW",
  "VIVARIUM_OPENROUTER_CONTEXT_WINDOW",
  "VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW",
] as const;

type RequiredEnvName = (typeof requiredEnvNames)[number];
type IntegerEnvName = (typeof integerEnvNames)[number];

function isPlaceholderValue(value: string): boolean {
  return /^<[^>]+>$/.test(value.trim());
}

function textEnv(env: Readonly<Record<string, string | undefined>>, name: RequiredEnvName): string | undefined {
  const value = env[name]?.trim();
  return value === undefined || value.length === 0 ? undefined : value;
}

function integerEnv(env: Readonly<Record<string, string | undefined>>, name: IntegerEnvName): number | undefined {
  const value = textEnv(env, name);
  if (value === undefined || isPlaceholderValue(value)) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function validateLiveSetupEnv(env: Readonly<Record<string, string | undefined>>): LiveSetupCommandResult | undefined {
  const missing = requiredEnvNames.filter((name) => textEnv(env, name) === undefined);
  const placeholders = requiredEnvNames.filter((name) => {
    const value = textEnv(env, name);
    return value !== undefined && isPlaceholderValue(value);
  });
  const invalid = integerEnvNames.filter((name) => textEnv(env, name) !== undefined && integerEnv(env, name) === undefined);

  if (missing.length > 0 || placeholders.length > 0 || invalid.length > 0) {
    return {
      ok: false,
      written: false,
      ...(missing.length === 0 ? {} : { missing }),
      ...(placeholders.length === 0 ? {} : { placeholders }),
      ...(invalid.length === 0 ? {} : { invalid }),
    };
  }

  return undefined;
}

function required(env: Readonly<Record<string, string | undefined>>, name: RequiredEnvName): string {
  const value = textEnv(env, name);
  if (value === undefined || isPlaceholderValue(value)) {
    throw new Error(`Missing required live setup env: ${name}`);
  }
  return value;
}

export function liveSetupCommand(options: LiveSetupCommandOptions): LiveSetupCommandResult {
  const invalid = validateLiveSetupEnv(options.env);
  if (invalid !== undefined) {
    return invalid;
  }

  if (!options.confirmWrite) {
    return {
      ok: false,
      written: false,
      requiresConfirmation: true,
      wouldWrite: ["providerProfiles", "credential"],
    };
  }

  const providerProfilesPath = required(options.env, "VIVARIUM_PROVIDER_PROFILES_PATH");
  const anthropicProfile = required(options.env, "VIVARIUM_ANTHROPIC_PROVIDER_PROFILE");
  const openRouterProfile = required(options.env, "VIVARIUM_OPENROUTER_PROVIDER_PROFILE");
  const privateProfile = required(options.env, "VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE");
  const credentialsPath = required(options.env, "VIVARIUM_CREDENTIALS_PATH");
  const credentialName = required(options.env, "VIVARIUM_INTERNAL_API_CREDENTIAL_NAME");

  configureProviderProfileCommand({
    profilesPath: providerProfilesPath,
    name: anthropicProfile,
    kind: "anthropic",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    model: required(options.env, "VIVARIUM_ANTHROPIC_MODEL"),
    capabilities: ["chat", "tools"],
    contextWindow: integerEnv(options.env, "VIVARIUM_ANTHROPIC_CONTEXT_WINDOW") ?? 1,
    costClass: "expensive",
  });
  configureProviderProfileCommand({
    profilesPath: providerProfilesPath,
    name: openRouterProfile,
    kind: "openai-compat",
    apiKeyEnv: "OPENROUTER_API_KEY",
    model: required(options.env, "VIVARIUM_OPENROUTER_MODEL"),
    baseUrl: required(options.env, "VIVARIUM_OPENROUTER_BASE_URL"),
    capabilities: ["chat", "json_mode"],
    contextWindow: integerEnv(options.env, "VIVARIUM_OPENROUTER_CONTEXT_WINDOW") ?? 1,
    costClass: "medium",
  });
  configureProviderProfileCommand({
    profilesPath: providerProfilesPath,
    name: privateProfile,
    kind: "openai-compat",
    apiKeyEnv: "VIVARIUM_OAI_COMPAT_API_KEY",
    model: required(options.env, "VIVARIUM_OAI_COMPAT_MODEL"),
    baseUrl: required(options.env, "VIVARIUM_OAI_COMPAT_BASE_URL"),
    capabilities: ["chat", "json_mode"],
    contextWindow: integerEnv(options.env, "VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW") ?? 1,
    costClass: "medium",
  });
  addCredentialCommand({
    credentialsPath,
    masterKey: required(options.env, "VIVARIUM_CREDENTIALS_MASTER_KEY"),
    kind: "bearer",
    name: credentialName,
    purpose: "Call internal API",
    value: required(options.env, "VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE"),
  });

  return {
    ok: true,
    written: true,
    providerProfiles: [anthropicProfile, openRouterProfile, privateProfile],
    credentialName,
    paths: { providerProfilesPath, credentialsPath },
  };
}
