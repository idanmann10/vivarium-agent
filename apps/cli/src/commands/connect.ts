import type { ProviderFetch } from "../../../../packages/providers/src/index.js";
import type { ExternalToolAdapters } from "../../../../packages/tools/src/index.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { renderVivariumGlobe } from "./branding.js";
import { credentialSmokeCommand, type CredentialSmokeCommandResult } from "./credentials.js";
import { renderLaunchSequence } from "./launch-sequence.js";
import type { LiveEnvInitCommandResult, LiveSetupCommandResult } from "./live.js";
import { providerSmokeCommand, type ProviderSmokeCommandResult } from "./providers.js";

export interface ConnectProvider {
  readonly name: string;
  readonly signupUrl?: string;
  readonly use: string;
  readonly details: readonly string[];
  readonly requirements: readonly ConnectProviderRequirement[];
}

export interface ConnectProviderRequirement {
  readonly label: string;
  readonly key: string;
  readonly kind?: "positiveInteger" | "url";
}

export interface ConnectProviderFieldStatus {
  readonly label: string;
  readonly key: string;
  readonly ready: boolean;
}

export interface ConnectProviderStatus {
  readonly name: string;
  readonly ready: boolean;
  readonly missing: readonly string[];
  readonly fields: readonly ConnectProviderFieldStatus[];
}

export interface ConnectCredentialStatus {
  readonly name: "Internal credential";
  readonly ready: boolean;
  readonly readyCount: number;
  readonly totalCount: number;
  readonly missing: readonly string[];
  readonly fields: readonly ConnectProviderFieldStatus[];
}

export interface ConnectEvidenceStatus {
  readonly name: "V1 evidence file";
  readonly ready: boolean;
  readonly readyCount: number;
  readonly totalCount: number;
  readonly missing: readonly string[];
  readonly fields: readonly ConnectProviderFieldStatus[];
  readonly path?: string;
}

export interface ConnectGroupedStatus {
  readonly name: string;
  readonly ready: boolean;
  readonly readyCount: number;
  readonly totalCount: number;
  readonly missing: readonly string[];
  readonly fields: readonly ConnectProviderFieldStatus[];
}

export interface ConnectSetupStatus {
  readonly envFilePath: string;
  readonly readyCount: number;
  readonly totalCount: number;
  readonly namesAndWorlds: ConnectGroupedStatus;
  readonly github: ConnectGroupedStatus;
  readonly providers: readonly ConnectProviderStatus[];
  readonly credential: ConnectCredentialStatus;
  readonly evidence: ConnectEvidenceStatus;
}

export interface ConnectCommandOptions {
  readonly showDetails?: boolean;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly envFilePath?: string;
  readonly pathExists?: (path: string) => boolean;
}

export interface ConnectCommandResult {
  readonly showDetails: boolean;
  readonly providers: readonly ConnectProvider[];
  readonly setupStatus?: ConnectSetupStatus;
  readonly nextCommands: readonly string[];
  readonly detailCommands: readonly string[];
}

export interface ConnectSignupCommandResult {
  readonly providers: readonly ConnectProvider[];
  readonly setupStatus?: ConnectSetupStatus;
  readonly nextCommands: readonly string[];
}

export interface ConnectSignupCommandOptions {
  readonly setupStatus?: ConnectSetupStatus;
}

export interface ConnectWizardCommandResult {
  readonly envFilePath: string;
  readonly setupFileStatus: "created" | "existing" | "blocked";
  readonly setupDir?: string;
  readonly mode?: "0600";
  readonly templatePath?: string;
  readonly prefilled: readonly string[];
  readonly providers: readonly ConnectProvider[];
  readonly secretFiles?: ConnectSecretFiles;
  readonly fillResult?: ConnectFillCommandResult;
  readonly setupResult?: LiveSetupCommandResult;
  readonly nextCommands: readonly string[];
  readonly error?: string;
}

export interface ConnectSecretFiles {
  readonly directory: string;
  readonly files: readonly ConnectSecretFile[];
  readonly resumeCommand?: string;
}

export interface ConnectSecretFile {
  readonly label: string;
  readonly path: string;
  readonly status: "created" | "existing";
  readonly ready: boolean;
}

export interface ConnectSmokeCommandOptions {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly providerFetch?: ProviderFetch;
  readonly credentialFetch?: NonNullable<ExternalToolAdapters["fetch"]>;
  readonly pathExists?: (path: string) => boolean;
}

export interface ConnectFillValues {
  readonly agentRepoName?: string;
  readonly worldRepoName?: string;
  readonly canonicalWorldRef?: string;
  readonly privateWorldRef?: string;
  readonly githubToken?: string;
  readonly githubOwner?: string;
  readonly githubRepositoryId?: string;
  readonly githubDiscussionCategoryId?: string;
  readonly anthropicApiKey?: string;
  readonly openRouterApiKey?: string;
  readonly privateOaiCompatApiKey?: string;
  readonly privateOaiCompatBaseUrl?: string;
  readonly privateOaiCompatModel?: string;
  readonly privateOaiCompatContextWindow?: string;
  readonly providerProfilesPath?: string;
  readonly credentialsPath?: string;
  readonly credentialsMasterKey?: string;
  readonly internalApiCredentialName?: string;
  readonly internalApiCredentialValue?: string;
  readonly internalApiHealthUrl?: string;
  readonly v1EvidencePath?: string;
}

export interface ConnectFillCommandOptions {
  readonly envFilePath: string;
  readonly values: ConnectFillValues;
}

export interface ConnectFillUpdate {
  readonly group: string;
  readonly label: string;
  readonly key: string;
}

export type ConnectFillCommandResult =
  | {
      readonly ok: true;
      readonly written: true;
      readonly envFilePath: string;
      readonly updated: readonly ConnectFillUpdate[];
    }
  | {
      readonly ok: false;
      readonly written: false;
      readonly envFilePath: string;
      readonly error: string;
    };

export interface ConnectSmokeCheck {
  readonly label: string;
  readonly ok: boolean;
  readonly detail?: string;
  readonly needs?: readonly string[];
  readonly error?: string;
}

export interface ConnectSmokeCommandResult {
  readonly ok: boolean;
  readonly checks: readonly ConnectSmokeCheck[];
}

type BlockedLiveSetupCommandResult = Extract<LiveSetupCommandResult, { readonly ok: false }>;

const providers: readonly ConnectProvider[] = [
  {
    name: "Anthropic",
    signupUrl: "https://console.anthropic.com/settings/keys",
    use: "Direct Claude coverage for live v1 provider smoke.",
    details: [
      "Key: ANTHROPIC_API_KEY",
      "Profile: VIVARIUM_ANTHROPIC_PROVIDER_PROFILE",
      "Model/context: VIVARIUM_ANTHROPIC_MODEL, VIVARIUM_ANTHROPIC_CONTEXT_WINDOW",
    ],
    requirements: [
      { label: "API key", key: "ANTHROPIC_API_KEY" },
      { label: "model", key: "VIVARIUM_ANTHROPIC_MODEL" },
      { label: "context window", key: "VIVARIUM_ANTHROPIC_CONTEXT_WINDOW", kind: "positiveInteger" },
    ],
  },
  {
    name: "OpenRouter",
    signupUrl: "https://openrouter.ai/keys",
    use: "One account and OpenAI-compatible endpoint across many models.",
    details: [
      "Key: OPENROUTER_API_KEY",
      "Base URL: https://openrouter.ai/api/v1",
      "Profile/model/context: VIVARIUM_OPENROUTER_PROVIDER_PROFILE, VIVARIUM_OPENROUTER_MODEL, VIVARIUM_OPENROUTER_CONTEXT_WINDOW",
    ],
    requirements: [
      { label: "API key", key: "OPENROUTER_API_KEY" },
      { label: "model", key: "VIVARIUM_OPENROUTER_MODEL" },
      { label: "base URL", key: "VIVARIUM_OPENROUTER_BASE_URL" },
      { label: "context window", key: "VIVARIUM_OPENROUTER_CONTEXT_WINDOW", kind: "positiveInteger" },
    ],
  },
  {
    name: "Private OpenAI-compatible",
    use: "Internal or fine-tuned OpenAI-compatible endpoint for private coverage.",
    details: [
      "Key: VIVARIUM_OAI_COMPAT_API_KEY",
      "Base/model/context: VIVARIUM_OAI_COMPAT_BASE_URL, VIVARIUM_OAI_COMPAT_MODEL, VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW",
      "Profile: VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE",
    ],
    requirements: [
      { label: "API key", key: "VIVARIUM_OAI_COMPAT_API_KEY" },
      { label: "base URL", key: "VIVARIUM_OAI_COMPAT_BASE_URL" },
      { label: "model", key: "VIVARIUM_OAI_COMPAT_MODEL" },
      { label: "context window", key: "VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW", kind: "positiveInteger" },
    ],
  },
];

function isDefaultLiveSetupPath(envFilePath: string): boolean {
  return (
    envFilePath === "live-readiness.local.env" ||
    envFilePath.endsWith("/.vivarium/live/live-readiness.local.env")
  );
}

function isPrivateDefaultLiveSetupPath(envFilePath: string): boolean {
  return envFilePath.endsWith("/.vivarium/live/live-readiness.local.env");
}

function isDefaultSecretsDir(path: string): boolean {
  return path.endsWith("/.vivarium/secrets");
}

function connectSetupWriteCommand(envFilePath: string): string {
  return isDefaultLiveSetupPath(envFilePath)
    ? "vivarium connect setup --confirm-write"
    : `vivarium connect setup --env-file ${envFilePath} --confirm-write`;
}

function connectInitCommand(envFilePath: string): string {
  return isDefaultLiveSetupPath(envFilePath)
    ? "vivarium connect init"
    : `vivarium connect init --path ${envFilePath}`;
}

function connectInitOrOnboardCommand(envFilePath: string): string {
  return isDefaultLiveSetupPath(envFilePath)
    ? "vivarium setup live"
    : connectInitCommand(envFilePath);
}

function missingSetupFileFillError(envFilePath: string): string {
  return isDefaultLiveSetupPath(envFilePath)
    ? "Setup file not found. Run vivarium setup live first."
    : "Setup file not found. Run vivarium connect init first.";
}

function connectSignupCommandLine(): string {
  return "vivarium connect signup";
}

function connectCommandLine(envFilePath: string): string {
  return isDefaultLiveSetupPath(envFilePath)
    ? "vivarium connect"
    : `vivarium connect --env-file ${envFilePath}`;
}

function connectFillCommandLine(envFilePath: string): string {
  return isDefaultLiveSetupPath(envFilePath)
    ? "vivarium connect fill"
    : `vivarium connect fill --env-file ${envFilePath}`;
}

function connectSmokeCommandLine(envFilePath: string): string {
  return isDefaultLiveSetupPath(envFilePath)
    ? "vivarium connect smoke"
    : `vivarium connect smoke --env-file ${envFilePath}`;
}

function proofCommandLine(envFilePath: string): string {
  return isDefaultLiveSetupPath(envFilePath)
    ? "vivarium proof"
    : `vivarium proof --env-file ${envFilePath}`;
}

function proofInitCommandLine(envFilePath: string): string {
  return isDefaultLiveSetupPath(envFilePath)
    ? "vivarium proof init"
    : `vivarium proof init --env-file ${envFilePath}`;
}

function doctorLiveCommandLine(envFilePath: string): string {
  return isDefaultLiveSetupPath(envFilePath)
    ? "vivarium doctor --live"
    : `vivarium doctor --live --env-file ${envFilePath}`;
}

const defaultNextCommands = [
  "vivarium setup live",
  "vivarium connect signup",
  "vivarium connect",
  "vivarium connect fill",
  "vivarium connect setup --confirm-write",
  "vivarium connect smoke",
  "vivarium proof init",
  "vivarium proof",
  "vivarium doctor --live",
] as const;

function liveSetupNextCommands(
  envFilePath: string,
  options: { readonly includeFill?: boolean; readonly includeSetup?: boolean } = {},
): readonly string[] {
  const quotedEnvFilePath = shellQuote(envFilePath);
  return [
    connectSignupCommandLine(),
    connectCommandLine(quotedEnvFilePath),
    ...(options.includeFill === false ? [] : [connectFillCommandLine(quotedEnvFilePath)]),
    ...(options.includeSetup === false ? [] : [connectSetupWriteCommand(quotedEnvFilePath)]),
    connectSmokeCommandLine(quotedEnvFilePath),
    proofInitCommandLine(quotedEnvFilePath),
    proofCommandLine(quotedEnvFilePath),
    doctorLiveCommandLine(quotedEnvFilePath),
  ];
}

function wizardResumeCommandLine(envFilePath: string, secretsDir: string, setupDir: string | undefined): string {
  if (isDefaultLiveSetupPath(envFilePath) && isDefaultSecretsDir(secretsDir)) {
    return "vivarium setup live";
  }

  return [
    `vivarium connect wizard --path ${shellQuote(envFilePath)}`,
    `--secrets-dir ${shellQuote(secretsDir)}`,
    ...(setupDir === undefined ? [] : [`--setup-dir ${shellQuote(setupDir)}`]),
  ].join(" ");
}

function secretFileNextCommands(
  envFilePath: string,
  secretsDir: string,
  setupDir: string | undefined,
  resumeCommand: string | undefined,
): readonly string[] {
  const quotedEnvFilePath = shellQuote(envFilePath);
  return [
    connectSignupCommandLine(),
    connectCommandLine(quotedEnvFilePath),
    resumeCommand ?? wizardResumeCommandLine(envFilePath, secretsDir, setupDir),
  ];
}

const detailCommands = [
  'vivarium providers configure --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" --name "$VIVARIUM_ANTHROPIC_PROVIDER_PROFILE" --kind anthropic --api-key-env ANTHROPIC_API_KEY --model "$VIVARIUM_ANTHROPIC_MODEL" --capability chat --capability json_mode --context-window "$VIVARIUM_ANTHROPIC_CONTEXT_WINDOW" --cost-class expensive',
  'vivarium providers configure --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" --name "$VIVARIUM_OPENROUTER_PROVIDER_PROFILE" --kind openai-compat --api-key-env OPENROUTER_API_KEY --model "$VIVARIUM_OPENROUTER_MODEL" --base-url https://openrouter.ai/api/v1 --capability chat --capability json_mode --context-window "$VIVARIUM_OPENROUTER_CONTEXT_WINDOW" --cost-class medium',
  'vivarium providers configure --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" --name "$VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE" --kind openai-compat --api-key-env VIVARIUM_OAI_COMPAT_API_KEY --model "$VIVARIUM_OAI_COMPAT_MODEL" --base-url "$VIVARIUM_OAI_COMPAT_BASE_URL" --capability chat --capability json_mode --context-window "$VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW" --cost-class medium',
  'vivarium providers smoke --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" --profile "$VIVARIUM_ANTHROPIC_PROVIDER_PROFILE"',
  'vivarium providers smoke --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" --profile "$VIVARIUM_OPENROUTER_PROVIDER_PROFILE"',
  'vivarium providers smoke --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" --profile "$VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE"',
] as const;

const connectSmokeDetailCommands = [
  'vivarium providers smoke --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" --profile "$VIVARIUM_ANTHROPIC_PROVIDER_PROFILE"',
  'vivarium providers smoke --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" --profile "$VIVARIUM_OPENROUTER_PROVIDER_PROFILE"',
  'vivarium providers smoke --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" --profile "$VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE"',
  'vivarium credentials smoke --path "$VIVARIUM_CREDENTIALS_PATH" --master-key "$VIVARIUM_CREDENTIALS_MASTER_KEY" --name "$VIVARIUM_INTERNAL_API_CREDENTIAL_NAME" --url "$VIVARIUM_INTERNAL_API_HEALTH_URL" --method GET',
] as const;

const credentialRequirements: readonly ConnectProviderRequirement[] = [
  { label: "credential store path", key: "VIVARIUM_CREDENTIALS_PATH" },
  { label: "master key", key: "VIVARIUM_CREDENTIALS_MASTER_KEY" },
  { label: "credential name", key: "VIVARIUM_INTERNAL_API_CREDENTIAL_NAME" },
  { label: "credential value", key: "VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE" },
  { label: "health URL", key: "VIVARIUM_INTERNAL_API_HEALTH_URL", kind: "url" },
];

const namesAndWorldRequirements: readonly ConnectProviderRequirement[] = [
  { label: "agent repo name", key: "VIVARIUM_AGENT_REPO_NAME" },
  { label: "world repo name", key: "VIVARIUM_WORLD_REPO_NAME" },
  { label: "canonical world ref", key: "VIVARIUM_CANONICAL_WORLD_REF" },
  { label: "private world ref", key: "VIVARIUM_PRIVATE_WORLD_REF" },
];

const githubRequirements: readonly ConnectProviderRequirement[] = [
  { label: "token", key: "GITHUB_TOKEN" },
  { label: "owner", key: "VIVARIUM_GITHUB_OWNER" },
  { label: "repository ID", key: "VIVARIUM_GITHUB_REPOSITORY_ID" },
  { label: "Discussion category ID", key: "VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID" },
];

const evidencePathKey = "VIVARIUM_V1_EVIDENCE_PATH";

const fillFields = [
  {
    valueKey: "agentRepoName",
    key: "VIVARIUM_AGENT_REPO_NAME",
    group: "Repository metadata",
    label: "agent repo name",
  },
  {
    valueKey: "worldRepoName",
    key: "VIVARIUM_WORLD_REPO_NAME",
    group: "Repository metadata",
    label: "world repo name",
  },
  {
    valueKey: "canonicalWorldRef",
    key: "VIVARIUM_CANONICAL_WORLD_REF",
    group: "World subscriptions",
    label: "canonical world ref",
  },
  {
    valueKey: "privateWorldRef",
    key: "VIVARIUM_PRIVATE_WORLD_REF",
    group: "World subscriptions",
    label: "private world ref",
  },
  {
    valueKey: "githubToken",
    key: "GITHUB_TOKEN",
    group: "GitHub/public release",
    label: "token",
  },
  {
    valueKey: "githubOwner",
    key: "VIVARIUM_GITHUB_OWNER",
    group: "GitHub/public release",
    label: "owner",
  },
  {
    valueKey: "githubRepositoryId",
    key: "VIVARIUM_GITHUB_REPOSITORY_ID",
    group: "GitHub/public release",
    label: "repository ID",
  },
  {
    valueKey: "githubDiscussionCategoryId",
    key: "VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID",
    group: "GitHub/public release",
    label: "Discussion category ID",
  },
  {
    valueKey: "anthropicApiKey",
    key: "ANTHROPIC_API_KEY",
    group: "Anthropic",
    label: "API key",
  },
  {
    valueKey: "openRouterApiKey",
    key: "OPENROUTER_API_KEY",
    group: "OpenRouter",
    label: "API key",
  },
  {
    valueKey: "privateOaiCompatApiKey",
    key: "VIVARIUM_OAI_COMPAT_API_KEY",
    group: "Private OpenAI-compatible",
    label: "API key",
  },
  {
    valueKey: "privateOaiCompatBaseUrl",
    key: "VIVARIUM_OAI_COMPAT_BASE_URL",
    group: "Private OpenAI-compatible",
    label: "base URL",
  },
  {
    valueKey: "privateOaiCompatModel",
    key: "VIVARIUM_OAI_COMPAT_MODEL",
    group: "Private OpenAI-compatible",
    label: "model",
  },
  {
    valueKey: "privateOaiCompatContextWindow",
    key: "VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW",
    group: "Private OpenAI-compatible",
    label: "context window",
  },
  {
    valueKey: "providerProfilesPath",
    key: "VIVARIUM_PROVIDER_PROFILES_PATH",
    group: "Provider profiles",
    label: "profile file path",
  },
  {
    valueKey: "credentialsPath",
    key: "VIVARIUM_CREDENTIALS_PATH",
    group: "Internal credential",
    label: "credential store path",
  },
  {
    valueKey: "credentialsMasterKey",
    key: "VIVARIUM_CREDENTIALS_MASTER_KEY",
    group: "Internal credential",
    label: "master key",
  },
  {
    valueKey: "internalApiCredentialName",
    key: "VIVARIUM_INTERNAL_API_CREDENTIAL_NAME",
    group: "Internal credential",
    label: "credential name",
  },
  {
    valueKey: "internalApiCredentialValue",
    key: "VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE",
    group: "Internal credential",
    label: "credential value",
  },
  {
    valueKey: "internalApiHealthUrl",
    key: "VIVARIUM_INTERNAL_API_HEALTH_URL",
    group: "Internal credential",
    label: "health URL",
  },
  {
    valueKey: "v1EvidencePath",
    key: "VIVARIUM_V1_EVIDENCE_PATH",
    group: "V1 evidence",
    label: "manifest path",
  },
] as const;
const fillableSetupKeys = new Set<string>(fillFields.map((field) => field.key));
const generatedLocalSetupKeys = new Set<string>([
  "VIVARIUM_PROVIDER_PROFILES_PATH",
  "VIVARIUM_CREDENTIALS_PATH",
  "VIVARIUM_INTERNAL_API_CREDENTIAL_NAME",
  "VIVARIUM_V1_EVIDENCE_PATH",
]);

const localSetupFileGroups = [
  {
    name: "Names and worlds",
    labels: new Set(["Agent repo name", "World repo name", "Canonical world ref", "Private world ref"]),
  },
  {
    name: "GitHub/public release",
    labels: new Set([
      "GitHub token",
      "GitHub owner",
      "GitHub repository ID",
      "GitHub Discussion category ID",
    ]),
  },
  {
    name: "Provider accounts",
    labels: new Set([
      "Anthropic API key",
      "OpenRouter API key",
      "Private model API key",
      "Private model base URL",
      "Private model name",
      "Private model context window",
    ]),
  },
  {
    name: "Internal credential",
    labels: new Set(["Credential master key", "Internal API token", "Internal API health URL"]),
  },
] as const;

const signupLocalFileGroups = [
  {
    name: "Names and worlds",
    files: [
      {
        label: "Agent repo name",
        path: "~/.vivarium/secrets/agent-repo-name.txt",
        key: "VIVARIUM_AGENT_REPO_NAME",
      },
      {
        label: "World repo name",
        path: "~/.vivarium/secrets/world-repo-name.txt",
        key: "VIVARIUM_WORLD_REPO_NAME",
      },
      {
        label: "Canonical world ref",
        path: "~/.vivarium/secrets/canonical-world-ref.txt",
        key: "VIVARIUM_CANONICAL_WORLD_REF",
      },
      {
        label: "Private world ref",
        path: "~/.vivarium/secrets/private-world-ref.txt",
        key: "VIVARIUM_PRIVATE_WORLD_REF",
      },
    ],
  },
  {
    name: "GitHub/public release",
    files: [
      { label: "GitHub token", path: "~/.vivarium/secrets/github-token.key", key: "GITHUB_TOKEN" },
      { label: "GitHub owner", path: "~/.vivarium/secrets/github-owner.txt", key: "VIVARIUM_GITHUB_OWNER" },
      {
        label: "GitHub repository ID",
        path: "~/.vivarium/secrets/github-repository-id.txt",
        key: "VIVARIUM_GITHUB_REPOSITORY_ID",
      },
      {
        label: "GitHub Discussion category ID",
        path: "~/.vivarium/secrets/github-discussion-category-id.txt",
        key: "VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID",
      },
    ],
  },
  {
    name: "Provider accounts",
    files: [
      { label: "Anthropic API key", path: "~/.vivarium/secrets/anthropic.key", key: "ANTHROPIC_API_KEY" },
      { label: "OpenRouter API key", path: "~/.vivarium/secrets/openrouter.key", key: "OPENROUTER_API_KEY" },
      {
        label: "Private model API key",
        path: "~/.vivarium/secrets/private-oai.key",
        key: "VIVARIUM_OAI_COMPAT_API_KEY",
      },
      {
        label: "Private model base URL",
        path: "~/.vivarium/secrets/private-base-url.txt",
        key: "VIVARIUM_OAI_COMPAT_BASE_URL",
      },
      {
        label: "Private model name",
        path: "~/.vivarium/secrets/private-model.txt",
        key: "VIVARIUM_OAI_COMPAT_MODEL",
      },
      {
        label: "Private model context window",
        path: "~/.vivarium/secrets/private-context-window.txt",
        key: "VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW",
      },
    ],
  },
  {
    name: "Internal credential",
    files: [
      {
        label: "Credential master key",
        path: "~/.vivarium/secrets/credential-master.key",
        key: "VIVARIUM_CREDENTIALS_MASTER_KEY",
      },
      {
        label: "Internal API token",
        path: "~/.vivarium/secrets/internal-api.token",
        key: "VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE",
      },
      {
        label: "Internal API health URL",
        path: "~/.vivarium/secrets/internal-health-url.txt",
        key: "VIVARIUM_INTERNAL_API_HEALTH_URL",
      },
    ],
  },
] as const;
const fillableSmokeNeedLabels = new Set([
  "API key",
  "base URL",
  "model",
  "context window",
  "profile file path",
  "credential store path",
  "master key",
  "credential name",
  "credential value",
  "health URL",
  "manifest path",
]);

function shellQuote(value: string): string {
  return /^[A-Za-z0-9_./:-]+$/.test(value) ? value : JSON.stringify(value);
}

function envFileLiteral(value: string): string {
  if (value.includes("\n") || value.includes("\r")) {
    throw new Error("Setup values must fit on one line.");
  }
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function replaceEnvAssignment(body: string, key: string, value: string): string {
  const line = `export ${key}=${envFileLiteral(value)}`;
  const pattern = new RegExp(`^(?:export\\s+)?${key}=.*$`, "m");
  if (pattern.test(body)) {
    return body.replace(pattern, line);
  }

  return `${body.trimEnd()}\n${line}\n`;
}

function isPlaceholder(value: string | undefined): boolean {
  if (value === undefined) {
    return true;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 || (trimmed.startsWith("<") && trimmed.endsWith(">"));
}

function isReadyRequirement(
  requirement: ConnectProviderRequirement,
  env: Readonly<Record<string, string | undefined>>,
): boolean {
  const raw = env[requirement.key];
  if (isPlaceholder(raw)) {
    return false;
  }
  if (requirement.kind !== "positiveInteger") {
    if (requirement.kind === "url") {
      try {
        const parsed = new URL(raw ?? "");
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    }
    return true;
  }

  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0;
}

function providerStatus(
  provider: ConnectProvider,
  env: Readonly<Record<string, string | undefined>>,
): ConnectProviderStatus {
  const fields = provider.requirements.map((requirement) => ({
    label: requirement.label,
    key: requirement.key,
    ready: isReadyRequirement(requirement, env),
  }));
  const missing = fields.filter((field) => !field.ready).map((field) => field.label);

  return {
    name: provider.name,
    ready: missing.length === 0,
    missing,
    fields,
  };
}

function credentialStatus(env: Readonly<Record<string, string | undefined>>): ConnectCredentialStatus {
  const fields = credentialRequirements.map((requirement) => ({
    label: requirement.label,
    key: requirement.key,
    ready: isReadyRequirement(requirement, env),
  }));
  const missing = fields.filter((field) => !field.ready).map((field) => field.label);

  return {
    name: "Internal credential",
    ready: missing.length === 0,
    readyCount: fields.filter((field) => field.ready).length,
    totalCount: fields.length,
    missing,
    fields,
  };
}

function groupedStatus(
  name: string,
  requirements: readonly ConnectProviderRequirement[],
  env: Readonly<Record<string, string | undefined>>,
): ConnectGroupedStatus {
  const fields = requirements.map((requirement) => ({
    label: requirement.label,
    key: requirement.key,
    ready: isReadyRequirement(requirement, env),
  }));
  const missing = fields.filter((field) => !field.ready).map((field) => field.label);

  return {
    name,
    ready: missing.length === 0,
    readyCount: fields.filter((field) => field.ready).length,
    totalCount: fields.length,
    missing,
    fields,
  };
}

function evidenceStatus(
  env: Readonly<Record<string, string | undefined>>,
  pathExists: (path: string) => boolean,
): ConnectEvidenceStatus {
  const rawPath = env[evidencePathKey];
  const pathReady = !isPlaceholder(rawPath);
  const path = pathReady ? rawPath?.trim() : undefined;
  const fileReady = path === undefined ? false : pathExists(path);
  const fields = [
    {
      label: "manifest path",
      key: evidencePathKey,
      ready: pathReady,
    },
    {
      label: "evidence manifest file",
      key: "Evidence file",
      ready: fileReady,
    },
  ] as const;
  const missing = fields.filter((field) => !field.ready).map((field) => field.label);

  return {
    name: "V1 evidence file",
    ready: missing.length === 0,
    readyCount: fields.filter((field) => field.ready).length,
    totalCount: fields.length,
    missing,
    fields,
    ...(path === undefined ? {} : { path }),
  };
}

function setupStatus(options: ConnectCommandOptions): ConnectSetupStatus | undefined {
  if (options.envFilePath === undefined || options.env === undefined) {
    return undefined;
  }

  const env = options.env ?? {};
  const providerStatuses = providers.map((provider) => providerStatus(provider, env));
  return {
    envFilePath: options.envFilePath,
    readyCount: providerStatuses.filter((provider) => provider.ready).length,
    totalCount: providerStatuses.length,
    namesAndWorlds: groupedStatus("Names and worlds", namesAndWorldRequirements, env),
    github: groupedStatus("GitHub/public release", githubRequirements, env),
    providers: providerStatuses,
    credential: credentialStatus(env),
    evidence: evidenceStatus(env, options.pathExists ?? (() => false)),
  };
}

function hasFillableMissingValues(status: ConnectSetupStatus): boolean {
  return (
    !status.namesAndWorlds.ready ||
    !status.github.ready ||
    status.providers.some((provider) => !provider.ready) ||
    !status.credential.ready
  );
}

function nextCommandsFor(status: ConnectSetupStatus | undefined): readonly string[] {
  if (status === undefined) {
    return defaultNextCommands;
  }

  const envFilePath = shellQuote(status.envFilePath);
  const includeGuidedSetup =
    isDefaultLiveSetupPath(status.envFilePath) && hasFillableMissingValues(status);
  return [
    ...(includeGuidedSetup ? ["vivarium setup live", connectSignupCommandLine()] : []),
    connectCommandLine(envFilePath),
    ...(hasFillableMissingValues(status) ? [connectFillCommandLine(envFilePath)] : []),
    connectSetupWriteCommand(envFilePath),
    connectSmokeCommandLine(envFilePath),
    ...(status.evidence.ready ? [] : [proofInitCommandLine(envFilePath)]),
    proofCommandLine(envFilePath),
    doctorLiveCommandLine(envFilePath),
  ];
}

export function connectCommand(options: ConnectCommandOptions = {}): ConnectCommandResult {
  const status = setupStatus(options);
  return {
    showDetails: options.showDetails === true,
    providers,
    ...(status === undefined ? {} : { setupStatus: status }),
    nextCommands: nextCommandsFor(status),
    detailCommands,
  };
}

export function connectSignupCommand(
  options: ConnectSignupCommandOptions = {},
): ConnectSignupCommandResult {
  return {
    providers,
    ...(options.setupStatus === undefined ? {} : { setupStatus: options.setupStatus }),
    nextCommands: [
      "vivarium setup live",
      ...liveSetupNextCommands("live-readiness.local.env").filter((command) => command !== "vivarium connect signup"),
    ],
  };
}

export function connectWizardCommand(
  result: Pick<ConnectWizardCommandResult, "envFilePath" | "setupFileStatus"> &
    Partial<
      Pick<
        ConnectWizardCommandResult,
        | "mode"
        | "setupDir"
        | "templatePath"
        | "prefilled"
        | "secretFiles"
        | "fillResult"
        | "setupResult"
        | "error"
      >
    >,
): ConnectWizardCommandResult {
  const needsSecretValues = result.secretFiles?.files.some((file) => !file.ready) === true;
  return {
    envFilePath: result.envFilePath,
    setupFileStatus: result.setupFileStatus,
    ...(result.setupDir === undefined ? {} : { setupDir: result.setupDir }),
    ...(result.mode === undefined ? {} : { mode: result.mode }),
    ...(result.templatePath === undefined ? {} : { templatePath: result.templatePath }),
    prefilled: result.prefilled ?? [],
    providers,
    ...(result.secretFiles === undefined ? {} : { secretFiles: result.secretFiles }),
    ...(result.fillResult === undefined ? {} : { fillResult: result.fillResult }),
    ...(result.setupResult === undefined ? {} : { setupResult: result.setupResult }),
    nextCommands: needsSecretValues
      ? secretFileNextCommands(
          result.envFilePath,
          result.secretFiles?.directory ?? "",
          result.setupDir,
          result.secretFiles?.resumeCommand,
        )
      : liveSetupNextCommands(result.envFilePath, {
          includeFill: result.fillResult?.ok !== true,
          includeSetup: result.setupResult?.ok !== true,
        }),
    ...(result.error === undefined ? {} : { error: result.error }),
  };
}

export function connectFillCommand(options: ConnectFillCommandOptions): ConnectFillCommandResult {
  let body: string;
  try {
    body = readFileSync(options.envFilePath, "utf8");
  } catch (error) {
    return {
      ok: false,
      written: false,
      envFilePath: options.envFilePath,
      error:
        (error as { readonly code?: unknown }).code === "ENOENT"
          ? missingSetupFileFillError(options.envFilePath)
          : error instanceof Error
            ? error.message
            : String(error),
    };
  }

  const updated: ConnectFillUpdate[] = [];
  try {
    for (const field of fillFields) {
      const value = options.values[field.valueKey];
      if (value === undefined || value.trim().length === 0) {
        continue;
      }
      body = replaceEnvAssignment(body, field.key, value.trim());
      updated.push({ group: field.group, label: field.label, key: field.key });
    }
  } catch (error) {
    return {
      ok: false,
      written: false,
      envFilePath: options.envFilePath,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  if (updated.length === 0) {
    return {
      ok: false,
      written: false,
      envFilePath: options.envFilePath,
      error: "No setup values supplied. Pass friendly fill flags or safer --*-file inputs.",
    };
  }

  writeFileSync(options.envFilePath, body.endsWith("\n") ? body : `${body}\n`, "utf8");
  return { ok: true, written: true, envFilePath: options.envFilePath, updated };
}

function renderProvider(provider: ConnectProvider, showDetails: boolean): readonly string[] {
  return [
    `  ${provider.name}`,
    ...(provider.signupUrl === undefined ? [] : [`    Keys: ${provider.signupUrl}`]),
    `    Use: ${provider.use}`,
    ...(showDetails ? provider.details.map((detail) => `    ${detail}`) : []),
  ];
}

function renderSignupProvider(provider: ConnectProvider): readonly string[] {
  if (provider.signupUrl === undefined) {
    return [
      `  ${provider.name}`,
      "    Ask for the internal endpoint URL, model name, context window, and API key.",
      `    Use: ${provider.use}`,
    ];
  }

  return [
    `  ${provider.name}`,
    `    Keys: ${provider.signupUrl}`,
    `    Use: ${provider.use}`,
  ];
}

function renderProviderStatus(status: ConnectProviderStatus, showDetails: boolean): readonly string[] {
  const summary = status.ready
    ? `  [ready] ${status.name}`
    : `  [needs] ${status.name}: ${status.missing.join(", ")}`;

  return [
    summary,
    ...(showDetails
      ? status.fields.map((field) => `    ${field.key}: ${field.ready ? "set" : "needs value"}`)
      : []),
  ];
}

function renderReleaseCredentialHandoff(): readonly string[] {
  return [
    "Release and credential handoff",
    "  GitHub/public release",
    "    Need: GitHub token or gh auth, owner, repository ID, and Discussion category ID.",
    "    Use: GitHub auth, Discussions, PRs, workflow checks, and public release evidence.",
    "  Internal credential",
    "    Need: Internal API token, health URL, and local credential master key.",
    "    Use: Encrypted credential smoke without printing the secret.",
  ];
}

function setupFileIsReady(
  key: string,
  status: ConnectSetupStatus | undefined,
): boolean {
  if (status === undefined) {
    return false;
  }

  const fields = [
    ...status.namesAndWorlds.fields,
    ...status.github.fields,
    ...status.providers.flatMap((provider) => provider.fields),
    ...status.credential.fields,
  ];
  return fields.some((field) => field.key === key && field.ready);
}

function renderSignupLocalValueMap(status: ConnectSetupStatus | undefined): readonly string[] {
  const groups = signupLocalFileGroups
    .map((group) => ({
      name: group.name,
      files: status === undefined
        ? group.files
        : group.files.filter((file) => !setupFileIsReady(file.key, status)),
    }))
    .filter((group) => group.files.length > 0);

  if (status !== undefined && groups.length === 0) {
    return [
      "Local value map",
      "  All generated local setup files have concrete setup values.",
      "  Re-run vivarium connect to review readiness.",
    ];
  }

  return [
    "Local value map",
    status === undefined
      ? "  Run vivarium setup live once, then paste one value into each generated file."
      : "  Run vivarium setup live once, then paste values only into files still listed here.",
    ...groups.flatMap((group) => [
      `  ${group.name}:`,
      ...group.files.map((file) => `    ${file.label}: ${file.path}`),
    ]),
    status === undefined
      ? "  Paste one value per file; rerun vivarium setup live after filling them."
      : "  Paste the listed values; rerun vivarium setup live after filling them.",
  ];
}

function renderGroupedStatus(
  status: ConnectGroupedStatus,
  readinessLabel: string,
  showDetails: boolean,
): readonly string[] {
  const summary = status.ready
    ? `  [ready] ${status.name}`
    : `  [needs] ${status.name}: ${status.missing.join(", ")}`;

  return [
    `  ${readinessLabel}: ${status.readyCount}/${status.totalCount} ready`,
    summary,
    ...(showDetails
      ? status.fields.map((field) => `    ${field.key}: ${field.ready ? "set" : "needs value"}`)
      : []),
  ];
}

function renderCredentialStatus(status: ConnectCredentialStatus, showDetails: boolean): readonly string[] {
  const summary = status.ready
    ? `  [ready] ${status.name}`
    : `  [needs] ${status.name}: ${status.missing.join(", ")}`;

  return [
    `  Internal credential readiness: ${status.readyCount}/${status.totalCount} ready`,
    summary,
    ...(showDetails
      ? status.fields.map((field) => `    ${field.key}: ${field.ready ? "set" : "needs value"}`)
      : []),
  ];
}

function renderEvidenceStatus(status: ConnectEvidenceStatus, showDetails: boolean): readonly string[] {
  const summary = status.ready
    ? `  [ready] ${status.name}`
    : `  [needs] ${status.name}: ${status.missing.join(", ")}`;

  return [
    `  V1 evidence readiness: ${status.readyCount}/${status.totalCount} ready`,
    summary,
    "  doctor --live checks the required v1 evidence content.",
    ...(showDetails
      ? status.fields.map((field) => `    ${field.key}: ${field.ready ? "set" : "needs value"}`)
      : []),
  ];
}

function renderSetupStatus(
  status: ConnectSetupStatus | undefined,
  showDetails: boolean,
): readonly string[] {
  if (status === undefined) {
    return [];
  }

  const envFilePath = shellQuote(status.envFilePath);
  const setupGuidance = setupStatusGuidance(status, envFilePath);

  return [
    "",
    "Setup status",
    `  Setup file: ${status.envFilePath}`,
    ...renderGroupedStatus(status.namesAndWorlds, "Names/world readiness", showDetails),
    ...renderGroupedStatus(status.github, "GitHub/public release readiness", showDetails),
    `  Provider readiness: ${status.readyCount}/${status.totalCount} ready`,
    ...status.providers.flatMap((provider) => renderProviderStatus(provider, showDetails)),
    ...renderCredentialStatus(status.credential, showDetails),
    ...renderEvidenceStatus(status.evidence, showDetails),
    ...(setupGuidance === undefined ? [] : [`  ${setupGuidance}`]),
  ];
}

function setupStatusGuidance(status: ConnectSetupStatus, envFilePath: string): string | undefined {
  const hasFillableValues = hasFillableMissingValues(status);
  const hasMissingEvidence = !status.evidence.ready;
  if (!hasFillableValues && !hasMissingEvidence) {
    return undefined;
  }

  if (!hasFillableValues) {
    return `Run ${connectSetupWriteCommand(envFilePath)}. If evidence is still missing, run ${proofInitCommandLine(envFilePath)} before ${proofCommandLine(envFilePath)}.`;
  }

  const fillGuidance = isDefaultLiveSetupPath(status.envFilePath)
    ? defaultLiveSetupValueGuidance(envFilePath)
    : `Run ${connectFillCommandLine(envFilePath)} for setup labels.`;
  if (hasMissingEvidence) {
    return `${fillGuidance} Then run ${connectSetupWriteCommand(envFilePath)}. If evidence is still missing, run ${proofInitCommandLine(envFilePath)} before ${proofCommandLine(envFilePath)}.`;
  }

  return `${fillGuidance} Then run ${connectSetupWriteCommand(envFilePath)}.`;
}

function defaultLiveSetupValueGuidance(envFilePath: string): string {
  return `Run vivarium setup live for generated local files, open ${connectSignupCommandLine()} for account/secret handoff, or use ${connectFillCommandLine(envFilePath)} for scripted updates.`;
}

function providerRequirementLabel(key: string): { readonly provider: string; readonly label: string } | undefined {
  for (const provider of providers) {
    const requirement = provider.requirements.find((candidate) => candidate.key === key);
    if (requirement !== undefined) {
      return { provider: provider.name, label: requirement.label };
    }
  }

  if (key === "VIVARIUM_ANTHROPIC_PROVIDER_PROFILE") {
    return { provider: "Anthropic", label: "profile name" };
  }
  if (key === "VIVARIUM_OPENROUTER_PROVIDER_PROFILE") {
    return { provider: "OpenRouter", label: "profile name" };
  }
  if (key === "VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE") {
    return { provider: "Private OpenAI-compatible", label: "profile name" };
  }

  return undefined;
}

const providerSmokeTargets = [
  {
    label: "Anthropic provider",
    providerName: "Anthropic",
    profileEnv: "VIVARIUM_ANTHROPIC_PROVIDER_PROFILE",
  },
  {
    label: "OpenRouter provider",
    providerName: "OpenRouter",
    profileEnv: "VIVARIUM_OPENROUTER_PROVIDER_PROFILE",
  },
  {
    label: "Private OpenAI-compatible provider",
    providerName: "Private OpenAI-compatible",
    profileEnv: "VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE",
  },
] as const;

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function redactedSmokeError(error: string, env: Readonly<Record<string, string | undefined>>): string {
  const secretKeys = [
    "ANTHROPIC_API_KEY",
    "OPENROUTER_API_KEY",
    "VIVARIUM_OAI_COMPAT_API_KEY",
    "VIVARIUM_CREDENTIALS_MASTER_KEY",
    "VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE",
  ] as const;
  return secretKeys.reduce((next, key) => {
    const value = env[key];
    return value === undefined || value.length === 0 ? next : next.replaceAll(value, "<redacted>");
  }, error);
}

function providerSmokeNeeds(
  target: (typeof providerSmokeTargets)[number],
  env: Readonly<Record<string, string | undefined>>,
  pathExists: (path: string) => boolean,
): readonly string[] {
  const provider = providers.find((candidate) => candidate.name === target.providerName);
  if (provider === undefined) {
    return ["provider setup"];
  }

  const status = providerStatus(provider, env);
  const profilesPath = env.VIVARIUM_PROVIDER_PROFILES_PATH;
  return unique([
    ...status.missing,
    ...(isPlaceholder(profilesPath)
      ? ["profile file path"]
      : pathExists(profilesPath ?? "")
        ? []
        : ["profile file"]),
    ...(isPlaceholder(env[target.profileEnv]) ? ["profile name"] : []),
  ]);
}

function credentialSmokeNeeds(
  env: Readonly<Record<string, string | undefined>>,
  pathExists: (path: string) => boolean,
): readonly string[] {
  const credentialsPath = env.VIVARIUM_CREDENTIALS_PATH;
  return unique(
    [
      ...credentialRequirements
        .filter((requirement) => requirement.key !== "VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE")
        .filter((requirement) => !isReadyRequirement(requirement, env))
        .map((requirement) => requirement.label),
      ...(isPlaceholder(credentialsPath)
        ? []
        : pathExists(credentialsPath ?? "")
          ? []
          : ["credential store file"]),
    ],
  );
}

function providerSmokeCheck(
  label: string,
  result: ProviderSmokeCommandResult,
  env: Readonly<Record<string, string | undefined>>,
): ConnectSmokeCheck {
  if (!result.ok) {
    return { label, ok: false, error: redactedSmokeError(result.error, env) };
  }

  return {
    label,
    ok: true,
    detail: `${result.model} replied with ${result.responseLength} characters`,
  };
}

function credentialSmokeCheck(result: CredentialSmokeCommandResult, env: Readonly<Record<string, string | undefined>>): ConnectSmokeCheck {
  const label = "Internal credential";
  if (!result.ok) {
    return { label, ok: false, error: redactedSmokeError(result.error, env) };
  }

  return {
    label,
    ok: true,
    detail: `HTTP ${result.status} from ${result.url}`,
  };
}

function smokeHasFillableNeeds(result: ConnectSmokeCommandResult): boolean {
  return result.checks.some((check) => check.needs?.some((need) => fillableSmokeNeedLabels.has(need)) === true);
}

export async function connectSmokeCommand(options: ConnectSmokeCommandOptions): Promise<ConnectSmokeCommandResult> {
  const pathExists = options.pathExists ?? existsSync;
  const providerChecks: ConnectSmokeCheck[] = [];
  for (const target of providerSmokeTargets) {
    const needs = providerSmokeNeeds(target, options.env, pathExists);
    if (needs.length > 0) {
      providerChecks.push({ label: target.label, ok: false, needs });
      continue;
    }

    const result = await providerSmokeCommand({
      profilesPath: options.env.VIVARIUM_PROVIDER_PROFILES_PATH ?? "",
      profile: options.env[target.profileEnv] ?? "",
      env: options.env,
      ...(options.providerFetch === undefined ? {} : { fetch: options.providerFetch }),
    });
    providerChecks.push(providerSmokeCheck(target.label, result, options.env));
  }

  const credentialNeeds = credentialSmokeNeeds(options.env, pathExists);
  const credentialCheck =
    credentialNeeds.length > 0
      ? { label: "Internal credential", ok: false, needs: credentialNeeds }
      : credentialSmokeCheck(
          await credentialSmokeCommand({
            credentialsPath: options.env.VIVARIUM_CREDENTIALS_PATH ?? "",
            masterKey: options.env.VIVARIUM_CREDENTIALS_MASTER_KEY ?? "",
            name: options.env.VIVARIUM_INTERNAL_API_CREDENTIAL_NAME ?? "",
            url: options.env.VIVARIUM_INTERNAL_API_HEALTH_URL ?? "",
            method: "GET",
            ...(options.credentialFetch === undefined ? {} : { fetch: options.credentialFetch }),
          }),
          options.env,
        );

  const checks = [...providerChecks, credentialCheck];
  return { ok: checks.every((check) => check.ok), checks };
}

function renderConnectSmokeCheck(check: ConnectSmokeCheck): string {
  const prefix = check.ok ? "[ok]" : "[blocked]";
  if (check.ok) {
    return `  ${prefix} ${check.label}${check.detail === undefined ? "" : `: ${check.detail}`}`;
  }
  if (check.needs !== undefined && check.needs.length > 0) {
    return `  ${prefix} ${check.label}: needs ${check.needs.join(", ")}`;
  }
  return `  ${prefix} ${check.label}: ${check.error ?? "smoke failed"}`;
}

export function renderConnectSmokeCommandResult(
  result: ConnectSmokeCommandResult,
  options: { readonly envFilePath?: string; readonly showDetails?: boolean } = {},
): string {
  const rawEnvFilePath = options.envFilePath ?? "live-readiness.local.env";
  const envFilePath = shellQuote(rawEnvFilePath);
  const hasFillableNeeds = smokeHasFillableNeeds(result);
  const nextCommands = result.ok
    ? [proofCommandLine(envFilePath), doctorLiveCommandLine(envFilePath)]
    : [
        connectCommandLine(envFilePath),
        ...(hasFillableNeeds && isDefaultLiveSetupPath(rawEnvFilePath) ? [connectSignupCommandLine()] : []),
        ...(hasFillableNeeds ? [connectFillCommandLine(envFilePath)] : []),
        connectSetupWriteCommand(envFilePath),
        connectSmokeCommandLine(envFilePath),
      ];
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Connect Smoke",
    "----------------------",
    `Status: ${result.ok ? "ok" : "blocked"}`,
    `Setup file: ${options.envFilePath ?? "live-readiness.local.env"}`,
    "",
    "Smokes:",
    ...result.checks.map(renderConnectSmokeCheck),
    ...(options.showDetails === true
      ? ["", "Exact smoke commands:", ...connectSmokeDetailCommands.map((command) => `  ${command}`)]
      : []),
    "",
    "Next commands:",
    ...renderLaunchSequence(nextCommands),
    "",
  ].join("\n");
}

function credentialRequirementLabel(key: string): string | undefined {
  return credentialRequirements.find((candidate) => candidate.key === key)?.label;
}

function blockedConnectSetupNeeds(result: BlockedLiveSetupCommandResult): readonly string[] {
  const values = [
    ...(result.missing ?? []),
    ...(result.placeholders ?? []),
    ...(result.invalid ?? []),
  ];
  const providerNeeds = new Map<string, string[]>();
  const credentialNeeds: string[] = [];
  const liveMetadataNeeds: string[] = [];

  for (const value of values) {
    if (value === "VIVARIUM_PROVIDER_PROFILES_PATH") {
      providerNeeds.set("Provider profiles", [
        ...new Set([...(providerNeeds.get("Provider profiles") ?? []), "profile file path"]),
      ]);
      continue;
    }

    const providerLabel = providerRequirementLabel(value);
    if (providerLabel !== undefined) {
      providerNeeds.set(providerLabel.provider, [
        ...new Set([...(providerNeeds.get(providerLabel.provider) ?? []), providerLabel.label]),
      ]);
      continue;
    }

    const credentialLabel = credentialRequirementLabel(value);
    if (credentialLabel !== undefined) {
      credentialNeeds.push(credentialLabel);
      continue;
    }

    liveMetadataNeeds.push("setup value");
  }

  return [
    ...(providerNeeds.size === 0
      ? []
      : [
          "  Provider setup",
          ...[...providerNeeds.entries()].map(([provider, labels]) => `    ${provider}: ${labels.join(", ")}`),
        ]),
    ...(credentialNeeds.length === 0
      ? []
      : [
          "  Encrypted credentials/internal API",
          `    Internal credential: ${[...new Set(credentialNeeds)].join(", ")}`,
        ]),
    ...(liveMetadataNeeds.length === 0
      ? []
      : ["  Live metadata", `    ${[...new Set(liveMetadataNeeds)].join(", ")}`]),
  ];
}

function blockedSetupHasFillableValues(result: BlockedLiveSetupCommandResult): boolean {
  return [
    ...(result.missing ?? []),
    ...(result.placeholders ?? []),
    ...(result.invalid ?? []),
  ].some((key) => fillableSetupKeys.has(key));
}

export function renderConnectSetupCommandResult(
  result: BlockedLiveSetupCommandResult,
  options: { readonly envFilePath?: string; readonly showDetails?: boolean } = {},
): string {
  const rawEnvFilePath = options.envFilePath ?? "live-readiness.local.env";
  const envFilePath = shellQuote(rawEnvFilePath);
  const needs = blockedConnectSetupNeeds(result);
  const hasFillableValues = blockedSetupHasFillableValues(result);
  const exactFields = [
    ...(result.missing?.length ? [`  Missing: ${result.missing.join(", ")}`] : []),
    ...(result.placeholders?.length ? [`  Placeholders: ${result.placeholders.join(", ")}`] : []),
    ...(result.invalid?.length ? [`  Invalid: ${result.invalid.join(", ")}`] : []),
  ];
  const signupLinks = providers
    .filter((provider) => provider.signupUrl !== undefined)
    .map((provider) => `  ${provider.name}: ${provider.signupUrl}`);

  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Connect Setup",
    "----------------------",
    "Status: blocked",
    `Setup file: ${options.envFilePath ?? "live-readiness.local.env"}`,
    "",
    "Needs:",
    ...(needs.length === 0 ? ["  Live setup values"] : needs),
    ...(options.showDetails === true
      ? ["", "Exact setup fields:", ...(exactFields.length === 0 ? ["  none"] : exactFields)]
      : []),
    "",
    hasFillableValues
      ? isDefaultLiveSetupPath(rawEnvFilePath)
        ? `${defaultLiveSetupValueGuidance(envFilePath)} Then rerun setup.`
        : `Run ${connectFillCommandLine(envFilePath)} for provider/internal labels. Then rerun setup.`
      : `Fill these labels in ${rawEnvFilePath}, then rerun setup.`,
    "Use --details only if you need exact setup field names.",
    "",
    "Signup links:",
    ...signupLinks,
    "",
    "Next commands:",
    ...renderLaunchSequence([
      connectCommandLine(envFilePath),
      ...(hasFillableValues && isDefaultLiveSetupPath(rawEnvFilePath)
        ? [connectSignupCommandLine()]
        : []),
      ...(hasFillableValues ? [connectFillCommandLine(envFilePath)] : []),
      connectSetupWriteCommand(envFilePath),
    ]),
    "",
  ].join("\n");
}

export function renderConnectInitCommandResult(result: LiveEnvInitCommandResult): string {
  const envFilePath = shellQuote(result.path);
  const nextCommands = [
    connectFillCommandLine(envFilePath),
    connectSetupWriteCommand(envFilePath),
    connectSmokeCommandLine(envFilePath),
    proofInitCommandLine(envFilePath),
    proofCommandLine(envFilePath),
    doctorLiveCommandLine(envFilePath),
  ];

  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Connect Init",
    "---------------------",
    `Status: ${result.ok ? "written" : "blocked"}`,
    `Env file: ${result.path}`,
    ...(result.ok
      ? [
          `Template: ${result.templatePath}`,
          `Permissions: ${result.mode}`,
          ...(result.prefilled.length === 0
            ? []
            : [`Prefilled: ${result.prefilled.join(", ")}`]),
          "",
          "Next commands:",
          "  [1] Open account and key handoff",
          `      ${connectSignupCommandLine()}`,
          "  [2] Review live readiness",
          `      ${connectCommandLine(envFilePath)}`,
          "  [3] Fill live settings",
          `      Edit ${result.path} locally. Keep it out of git.`,
          `      Or use ${connectFillCommandLine(envFilePath)} with friendly labels.`,
          ...renderLaunchSequence(nextCommands, { startAt: 4 }),
        ]
      : [`Error: ${result.error}`]),
    "",
  ].join("\n");
}

function renderFillUpdates(updates: readonly ConnectFillUpdate[]): readonly string[] {
  const grouped = new Map<string, string[]>();
  for (const update of updates) {
    grouped.set(update.group, [...(grouped.get(update.group) ?? []), update.label]);
  }

  return [...grouped.entries()].map(([group, labels]) => `  ${group}: ${labels.join(", ")}`);
}

function renderConnectSignupLinks(): readonly string[] {
  return [
    "Signup links:",
    ...providers.flatMap((provider) =>
      provider.signupUrl === undefined ? [] : [`  ${provider.name}: ${provider.signupUrl}`],
    ),
  ];
}

function renderWizardProvider(provider: ConnectProvider): string {
  if (provider.signupUrl !== undefined) {
    return `  ${provider.name}: ${provider.signupUrl}`;
  }

  return `  ${provider.name}: ask for endpoint URL, model, context window, and API key`;
}

function renderWizardStatus(result: ConnectWizardCommandResult): string {
  if (result.setupFileStatus === "created") {
    return "setup file created";
  }
  if (result.setupFileStatus === "existing") {
    return "setup file already exists";
  }
  return "blocked";
}

function renderWizardFillResult(result: ConnectFillCommandResult | undefined): readonly string[] {
  if (result === undefined) {
    return [];
  }
  if (!result.ok) {
    return ["", "Filled setup values:", `  [blocked] ${result.error}`];
  }

  const heading = result.updated.every((update) => generatedLocalSetupKeys.has(update.key))
    ? "Default local files prepared:"
    : "Filled setup values:";
  return ["", heading, ...renderFillUpdates(result.updated)];
}

function setupFileCountLabel(count: number): string {
  return count === 1 ? "1 file" : `${count} files`;
}

function groupedSetupFiles(files: readonly ConnectSecretFile[]): readonly {
  readonly name: string;
  readonly files: readonly ConnectSecretFile[];
}[] {
  const grouped = localSetupFileGroups
    .map((group) => ({
      name: group.name,
      files: files.filter((file) => group.labels.has(file.label)),
    }))
    .filter((group) => group.files.length > 0);
  const groupedLabels = new Set(grouped.flatMap((group) => group.files.map((file) => file.label)));
  const otherFiles = files.filter((file) => !groupedLabels.has(file.label));

  return otherFiles.length === 0 ? grouped : [...grouped, { name: "Other setup values", files: otherFiles }];
}

function renderWizardSecretFileChecklist(files: readonly ConnectSecretFile[]): readonly string[] {
  if (files.length === 0) {
    return [];
  }

  return [
    "",
    "Local setup checklist:",
    ...groupedSetupFiles(files).map((group) => {
      const readyCount = group.files.filter((file) => file.ready).length;
      const status = readyCount === group.files.length ? "ready" : readyCount === 0 ? "needs" : "partial";
      const count =
        status === "partial"
          ? `${readyCount}/${group.files.length} files ready`
          : setupFileCountLabel(group.files.length);
      return `  [${status}] ${group.name}: ${count}`;
    }),
  ];
}

function renderWizardGroupedSecretFiles(files: readonly ConnectSecretFile[]): readonly string[] {
  return groupedSetupFiles(files).flatMap((group) => [
    `${group.name}:`,
    ...group.files.map((file) => `  ${file.label}: ${file.path}`),
  ]);
}

function renderWizardSecretFiles(result: ConnectSecretFiles | undefined): readonly string[] {
  if (result === undefined) {
    return [];
  }

  const created = result.files.filter((file) => file.status === "created");
  const existingReady = result.files.filter((file) => file.status === "existing" && file.ready);
  const existingPending = result.files.filter((file) => file.status === "existing" && !file.ready);
  const rerunCommand = result.resumeCommand ?? (isDefaultSecretsDir(result.directory)
    ? "vivarium setup live"
    : "the same wizard command");
  const pasteLine = `Paste each value into its file, then rerun ${rerunCommand}.`;
  return [
    ...renderWizardSecretFileChecklist(result.files),
    ...(created.length === 0
      ? []
      : [
          "",
          "Local setup files created:",
          ...renderWizardGroupedSecretFiles(created),
          pasteLine,
        ]),
    ...(existingPending.length === 0
      ? []
      : [
          "",
          created.length === 0
            ? "Local setup files waiting for values:"
            : "Local setup files still waiting for values:",
          ...renderWizardGroupedSecretFiles(existingPending),
          ...(created.length === 0 ? [pasteLine] : []),
        ]),
    ...(existingReady.length === 0
      ? []
      : [
          "",
          created.length === 0 && existingPending.length === 0
            ? "Local setup files ready:"
            : "Local setup files already ready:",
          ...renderWizardGroupedSecretFiles(existingReady),
        ]),
  ];
}

function hasPendingWizardSecretFiles(result: ConnectWizardCommandResult): boolean {
  return result.secretFiles?.files.some((file) => !file.ready) === true;
}

function renderWizardNextCommands(result: ConnectWizardCommandResult): readonly string[] {
  if (!hasPendingWizardSecretFiles(result) || result.secretFiles === undefined) {
    return renderLaunchSequence(result.nextCommands);
  }

  const envFilePath = shellQuote(result.envFilePath);
  const rerunCommand =
    result.secretFiles.resumeCommand ??
    wizardResumeCommandLine(result.envFilePath, result.secretFiles.directory, result.setupDir);
  return [
    "  [1] Open account and key handoff",
    `      ${connectSignupCommandLine()}`,
    "  [2] Paste local values and rerun setup",
    `      ${rerunCommand}`,
    "  [3] Review live readiness",
    `      ${connectCommandLine(envFilePath)}`,
  ];
}

function renderWizardSetupResult(result: LiveSetupCommandResult | undefined): readonly string[] {
  if (result === undefined) {
    return [];
  }
  if (result.ok) {
    return [
      "",
      "Live setup written:",
      `  Provider profiles: ${result.providerProfiles.join(", ")}`,
      `  Credential: ${result.credentialName}`,
      `  Provider profile file: ${result.paths.providerProfilesPath}`,
      `  Credential store: ${result.paths.credentialsPath}`,
      ...(result.paths.evidenceManifestPath === undefined
        ? []
        : [`  Evidence manifest: ${result.paths.evidenceManifestPath}`]),
    ];
  }
  if (result.requiresConfirmation === true) {
    return [
      "",
      "Live setup preview:",
      `  Provider profiles: ${result.providerProfiles?.join(", ") ?? "none"}`,
      `  Credential: ${result.credentialName ?? "none"}`,
      `  Provider profile file: ${result.paths?.providerProfilesPath ?? "not set"}`,
      `  Credential store: ${result.paths?.credentialsPath ?? "not set"}`,
      ...(result.paths?.evidenceManifestPath === undefined
        ? []
        : [`  Evidence manifest: ${result.paths.evidenceManifestPath}`]),
    ];
  }

  return [
    "",
    "Live setup write blocked:",
    "  Review readiness with vivarium connect, fill missing labels, then rerun the wizard with --confirm-write.",
  ];
}

function renderConnectFillExamples(envFilePath: string): readonly string[] {
  return [
    "Fill examples:",
    "  Secret file inputs and metadata",
    `    ${connectFillCommandLine(envFilePath)} \\`,
    "      --secrets-dir ~/.vivarium/secrets \\",
    "      --setup-dir ~/.vivarium/live \\",
    "      --private-base-url https://private.example/v1 \\",
    "      --private-model private-model \\",
    "      --private-context-window 128000 \\",
    "      --internal-health-url https://internal.example/health",
  ];
}

export function renderConnectFillCommandResult(
  result: ConnectFillCommandResult,
  options: { readonly showDetails?: boolean } = {},
): string {
  const envFilePath = shellQuote(result.envFilePath);
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Connect Fill",
    "---------------------",
    `Status: ${result.ok ? "written" : "blocked"}`,
    `Setup file: ${result.envFilePath}`,
    ...(result.ok
      ? [
          "",
          "Updated:",
          ...renderFillUpdates(result.updated),
          ...(options.showDetails === true
            ? ["", "Exact setup fields:", ...result.updated.map((update) => `  ${update.key}`)]
            : []),
          "",
          "Next commands:",
          ...renderLaunchSequence([
            connectCommandLine(envFilePath),
            connectSetupWriteCommand(envFilePath),
            connectSmokeCommandLine(envFilePath),
            proofCommandLine(envFilePath),
          ]),
        ]
      : [
          "",
          `Reason: ${result.error}`,
          "",
          ...renderConnectSignupLinks(),
          "",
          ...renderConnectFillExamples(envFilePath),
          "",
          "Next commands:",
          ...renderLaunchSequence([
            connectInitOrOnboardCommand(envFilePath),
            connectCommandLine(envFilePath),
          ]),
        ]),
    "",
  ].join("\n");
}

export function renderConnectWizardCommandResult(result: ConnectWizardCommandResult): string {
  const title = isPrivateDefaultLiveSetupPath(result.envFilePath)
    ? "Vivarium Live Onboarding"
    : "Vivarium Connect Wizard";
  return [
    renderVivariumGlobe(),
    "",
    title,
    "-".repeat(title.length),
    `Status: ${renderWizardStatus(result)}`,
    `Setup file: ${result.envFilePath}`,
    ...(result.mode === undefined ? [] : [`Permissions: ${result.mode}`]),
    ...(result.templatePath === undefined ? [] : [`Template: ${result.templatePath}`]),
    ...(result.prefilled.length === 0 ? [] : [`Prefilled: ${result.prefilled.join(", ")}`]),
    ...(result.setupFileStatus === "existing" ? ["Existing setup file reused."] : []),
    ...(result.error === undefined ? [] : [`Error: ${result.error}`]),
    ...renderWizardSecretFiles(result.secretFiles),
    ...renderWizardFillResult(result.fillResult),
    ...renderWizardSetupResult(result.setupResult),
    "",
    "Accounts and handoff:",
    ...result.providers.map(renderWizardProvider),
    "",
    "Keep values in local files; use vivarium connect fill only for scripted updates.",
    "Use vivarium connect to review readiness before writing provider profiles or credentials.",
    "",
    "Next commands:",
    ...renderWizardNextCommands(result),
    "",
    "Details:",
    "  Re-run the focused commands with --details only when you need exact setup fields.",
    "",
  ].join("\n");
}

export function renderConnectCommandResult(result: ConnectCommandResult): string {
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Connect",
    "----------------",
    "Model providers",
    ...result.providers.flatMap((provider) => renderProvider(provider, result.showDetails)),
    ...renderSetupStatus(result.setupStatus, result.showDetails),
    ...(result.setupStatus === undefined ? ["", ...renderReleaseCredentialHandoff()] : []),
    "",
    ...renderLaunchSequence(result.nextCommands, { heading: "Next commands:" }),
    ...(result.showDetails
      ? ["", "Detailed provider commands:", ...result.detailCommands.map((command) => `  ${command}`)]
      : [
          "",
          "Details:",
          "  Re-run with --details to show exact env keys and provider profile commands.",
        ]),
    "",
  ].join("\n");
}

export function renderConnectSignupCommandResult(result: ConnectSignupCommandResult): string {
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Connect Signup",
    "-----------------------",
    "Accounts and keys",
    ...result.providers.flatMap(renderSignupProvider),
    "",
    ...renderReleaseCredentialHandoff(),
    "",
    "Setup handoff",
    "  Run vivarium setup live to generate default local files.",
    "  Generated profiles, credentials, and evidence files stay under ~/.vivarium/live.",
    "  Use vivarium connect to review readiness before writing anything.",
    "",
    ...renderSignupLocalValueMap(result.setupStatus),
    "",
    "Next commands:",
    ...renderLaunchSequence(result.nextCommands),
    "",
  ].join("\n");
}
