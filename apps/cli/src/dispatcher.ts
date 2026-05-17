import type {
  Capability,
  CostClass,
  CredentialKind,
  Visibility,
} from "../../../packages/core/src/index.js";
import type { ProviderFetch } from "../../../packages/providers/src/index.js";
import { SQLiteStateRepository } from "../../../packages/state/src/index.js";
import type { ExternalToolAdapters } from "../../../packages/tools/src/index.js";
import type { HttpMethod } from "../../../packages/tools/src/external/index.js";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  addCredentialCommand,
  credentialSmokeCommand,
  listCredentialsCommand,
  renderAddCredentialCommandResult,
  renderCredentialSmokeCommandResult,
  renderListCredentialsCommandResult,
} from "./commands/credentials.js";
import {
  connectCommand,
  connectFillCommand,
  connectSignupCommand,
  connectSmokeCommand,
  connectWizardCommand,
  type ConnectSecretFiles,
  type ConnectFillValues,
  renderConnectInitCommandResult,
  renderConnectCommandResult,
  renderConnectFillCommandResult,
  renderConnectSignupCommandResult,
  renderConnectSetupCommandResult,
  renderConnectSmokeCommandResult,
  renderConnectWizardCommandResult,
} from "./commands/connect.js";
import {
  curriculumAdvanceCommand,
  curriculumProgressCommand,
  curriculumReadCommand,
  renderCurriculumProgressCommandResult,
  renderCurriculumReadCommandResult,
} from "./commands/curriculum.js";
import { daemonSmokeCommand, renderDaemonSmokeCommandResult } from "./commands/daemon.js";
import {
  doctorCommand,
  renderDoctorCommandResult,
  type DoctorCommandRunner,
} from "./commands/doctor.js";
import { dreamCommand, renderDreamCommandResult } from "./commands/dream.js";
import {
  githubDiscussionCommand,
  githubPullRequestCommand,
  githubSmokeCommand,
  githubWorkflowRunsCommand,
  renderGitHubDiscussionCommandResult,
  renderGitHubPullRequestCommandResult,
  renderGitHubSmokeCommandResult,
  renderGitHubWorkflowRunsCommandResult,
} from "./commands/github.js";
import {
  helpCommand,
  localRunHelpCommand,
  renderHelpCommandResult,
  renderLocalRunHelpCommandResult,
} from "./commands/help.js";
import {
  identityHistoryCommand,
  identityStageCommand,
  identitySummaryCommand,
  renderIdentityHistoryCommandResult,
  renderIdentityStageCommandResult,
  renderIdentitySummaryCommandResult,
} from "./commands/identity.js";
import { renderInitCommandResult, runInitCommand } from "./commands/init.js";
import { launchHandoffCommand, renderLaunchHandoffCommandResult } from "./commands/launch.js";
import {
  liveEnvInitCommand,
  liveEvidenceInitCommand,
  liveSetupCommand,
  renderLiveEnvInitCommandResult,
  renderLiveEvidenceInitCommandResult,
  renderLiveSetupCommandResult,
} from "./commands/live.js";
import { modelCommand, renderModelCommandResult } from "./commands/model.js";
import {
  publishListCommand,
  publishRunCommand,
  publishTraceCommand,
  renderPublishListCommandResult,
  renderPublishRunCommandResult,
  renderPublishTraceCommandResult,
} from "./commands/publish.js";
import {
  proofCommand,
  proofInitCommand,
  renderProofCommandResult,
  renderProofInitCommandResult,
} from "./commands/proof.js";
import {
  configureProviderProfileCommand,
  listProviderProfilesCommand,
  providerSmokeCommand,
  renderProviderProfilesCommandResult,
  renderProviderSmokeCommandResult,
  type ProviderSmokeKind,
} from "./commands/providers.js";
import { renderRunCommandResult, runCommand, type RunProviderKind } from "./commands/run.js";
import { renderSetupCommandResult, setupCommand } from "./commands/setup.js";
import { listSkillsCommand, renderListSkillsCommandResult } from "./commands/skills.js";
import { renderStatusCommandResult, statusCommand } from "./commands/status.js";
import {
  renderUpdateCommandResult,
  updateCommand,
  type UpdateCommandRunner,
} from "./commands/update.js";
import {
  listWorldSubscriptionsCommand,
  pullWorldCommand,
  renderPullWorldCommandResult,
  renderSearchWorldCommandResult,
  renderVerifyWorldTransmissionCommandResult,
  renderWorldSubscriptionsCommandResult,
  searchWorldCommand,
  subscribeWorldCommand,
  verifyWorldTransmissionCommand,
} from "./commands/world.js";
import type { CliCommand } from "./index.js";

export interface CliDispatchResult {
  readonly command: CliCommand;
  readonly result: unknown;
  readonly output: string;
}

export interface CliDispatchOptions {
  readonly credentialFetch?: NonNullable<ExternalToolAdapters["fetch"]>;
  readonly doctorRunner?: DoctorCommandRunner;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly providerFetch?: ProviderFetch;
  readonly updateRunner?: UpdateCommandRunner;
}

type FlagMap = ReadonlyMap<string, readonly string[]>;

const secretDirFiles = [
  { label: "Agent repo name", name: "agent-repo-name.txt" },
  { label: "World repo name", name: "world-repo-name.txt" },
  { label: "Canonical world ref", name: "canonical-world-ref.txt" },
  { label: "Private world ref", name: "private-world-ref.txt" },
  { label: "GitHub token", name: "github-token.key" },
  { label: "GitHub owner", name: "github-owner.txt" },
  { label: "GitHub repository ID", name: "github-repository-id.txt" },
  { label: "GitHub Discussion category ID", name: "github-discussion-category-id.txt" },
  { label: "Anthropic API key", name: "anthropic.key" },
  { label: "OpenRouter API key", name: "openrouter.key" },
  { label: "Private model API key", name: "private-oai.key" },
  { label: "Private model base URL", name: "private-base-url.txt" },
  { label: "Private model name", name: "private-model.txt" },
  { label: "Private model context window", name: "private-context-window.txt" },
  { label: "Credential master key", name: "credential-master.key" },
  { label: "Internal API token", name: "internal-api.token" },
  { label: "Internal API health URL", name: "internal-health-url.txt" },
] as const;

export class CliUsageError extends Error {
  readonly nextCommands: readonly string[];

  constructor(message: string, nextCommands: readonly string[] = ["vivarium help"]) {
    super(message);
    this.name = "CliUsageError";
    this.nextCommands = nextCommands;
  }
}

function shellQuote(value: string): string {
  return /^[A-Za-z0-9_./:-]+$/.test(value) ? value : JSON.stringify(value);
}

function statusCommandForRun(
  explicitStatePath: string | undefined,
  explicitLiveEnvPath: string | undefined,
): string {
  return [
    "vivarium status",
    ...(explicitStatePath === undefined ? [] : [`--state-path ${shellQuote(explicitStatePath)}`]),
    ...(explicitLiveEnvPath === undefined ? [] : [`--live-env-path ${shellQuote(explicitLiveEnvPath)}`]),
  ].join(" ");
}

function setupLiveResumeCommand(flags: FlagMap): string {
  const setupDir = value(flags, "setup-dir");
  const secretsDir = value(flags, "secrets-dir");
  return [
    "vivarium setup live",
    ...(setupDir === undefined ? [] : [`--setup-dir ${shellQuote(setupDir)}`]),
    ...(secretsDir === undefined ? [] : [`--secrets-dir ${shellQuote(secretsDir)}`]),
  ].join(" ");
}

function usage(message: string, nextCommands?: readonly string[]): never {
  throw new CliUsageError(message, nextCommands);
}

function defaultStatePath(env: Readonly<Record<string, string | undefined>> | undefined): string {
  return join(defaultVivariumHome(env), ".vivarium", "state.db");
}

interface GitCheckoutRef {
  readonly ref: string;
  readonly scriptRef: string;
}

function gitOutput(args: readonly string[], cwd: string): string | undefined {
  const result = Bun.spawnSync(["git", ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    return undefined;
  }
  const text = result.stdout.toString().trim();
  return text.length === 0 ? undefined : text;
}

function currentPreMainCheckoutRef(cwd: string): GitCheckoutRef | undefined {
  const branch = gitOutput(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
  if (branch === undefined || branch === "main" || branch === "master") {
    return undefined;
  }
  const commit = gitOutput(["rev-parse", "HEAD"], cwd);
  if (commit === undefined) {
    return undefined;
  }
  return {
    ref: branch === "HEAD" ? commit : branch,
    scriptRef: commit,
  };
}

const connectSetupNextCommands = [
  "vivarium connect signup",
  "vivarium connect fill",
  "vivarium connect setup --confirm-write",
] as const;

const connectSmokeNextCommands = [
  ...connectSetupNextCommands,
  "vivarium connect smoke",
] as const;

function parseFlags(argv: readonly string[]): {
  readonly positionals: readonly string[];
  readonly flags: FlagMap;
} {
  const positionals: string[] = [];
  const flags = new Map<string, string[]>();

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === undefined) {
      continue;
    }
    if (!item.startsWith("--")) {
      positionals.push(item);
      continue;
    }

    const key = item.slice(2);
    const next = argv[index + 1];
    const values = flags.get(key) ?? [];
    if (next === undefined || next.startsWith("--")) {
      flags.set(key, [...values, "true"]);
      continue;
    }

    flags.set(key, [...values, next]);
    index += 1;
  }

  return { positionals, flags };
}

function value(flags: FlagMap, name: string): string | undefined {
  return flags.get(name)?.at(-1);
}

function values(flags: FlagMap, name: string): readonly string[] {
  return flags.get(name) ?? [];
}

function required(flags: FlagMap, name: string, nextCommands?: readonly string[]): string {
  return value(flags, name) ?? usage(`Missing required --${name}`, nextCommands);
}

function valueOrFileInDir(
  flags: FlagMap,
  name: string,
  fileName: string,
  directory: string | undefined,
  defaultFileName: string,
): string | undefined {
  const direct = value(flags, name);
  if (direct !== undefined) {
    return direct;
  }

  const explicitPath = value(flags, fileName);
  if (explicitPath !== undefined) {
    const explicitValue = readFileSync(explicitPath, "utf8").trim();
    return explicitValue.length === 0 ? undefined : explicitValue;
  }

  const path = directory === undefined ? undefined : join(directory, defaultFileName);
  if (path === undefined) {
    return undefined;
  }

  try {
    const fileValue = readFileSync(path, "utf8").trim();
    return fileValue.length === 0 ? undefined : fileValue;
  } catch (error) {
    if ((error as { readonly code?: unknown }).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

function scaffoldSecretFiles(
  directory: string | undefined,
  resumeCommand: string | undefined,
): ConnectSecretFiles | undefined {
  if (directory === undefined) {
    return undefined;
  }

  mkdirSync(directory, { recursive: true });
  return {
    directory,
    ...(resumeCommand === undefined ? {} : { resumeCommand }),
    files: secretDirFiles.map((file) => {
      const path = join(directory, file.name);
      try {
        const body = readFileSync(path, "utf8");
        return {
          label: file.label,
          path,
          status: "existing" as const,
          ready: body.trim().length > 0,
        };
      } catch (error) {
        if ((error as { readonly code?: unknown }).code !== "ENOENT") {
          throw error;
        }
      }

      try {
        writeFileSync(path, "", { encoding: "utf8", flag: "wx", mode: 0o600 });
        chmodSync(path, 0o600);
        return { label: file.label, path, status: "created" as const, ready: false };
      } catch (error) {
        if ((error as { readonly code?: unknown }).code !== "EEXIST") {
          throw error;
        }
        const body = readFileSync(path, "utf8");
        return {
          label: file.label,
          path,
          status: "existing" as const,
          ready: body.trim().length > 0,
        };
      }
    }),
  };
}

function connectFillValuesFromFlags(flags: FlagMap): Partial<Record<keyof ConnectFillValues, string>> {
  const fillValues: Partial<Record<keyof ConnectFillValues, string>> = {};
  const secretsDir = value(flags, "secrets-dir");
  const agentRepoName = valueOrFileInDir(
    flags,
    "agent-repo",
    "agent-repo-file",
    secretsDir,
    "agent-repo-name.txt",
  );
  const worldRepoName = valueOrFileInDir(
    flags,
    "world-repo",
    "world-repo-file",
    secretsDir,
    "world-repo-name.txt",
  );
  const canonicalWorldRef = valueOrFileInDir(
    flags,
    "canonical-world-ref",
    "canonical-world-ref-file",
    secretsDir,
    "canonical-world-ref.txt",
  );
  const privateWorldRef = valueOrFileInDir(
    flags,
    "private-world-ref",
    "private-world-ref-file",
    secretsDir,
    "private-world-ref.txt",
  );
  const githubToken = valueOrFileInDir(
    flags,
    "github-token",
    "github-token-file",
    secretsDir,
    "github-token.key",
  );
  const githubOwner = valueOrFileInDir(
    flags,
    "github-owner",
    "github-owner-file",
    secretsDir,
    "github-owner.txt",
  );
  const githubRepositoryId = valueOrFileInDir(
    flags,
    "github-repository-id",
    "github-repository-id-file",
    secretsDir,
    "github-repository-id.txt",
  );
  const githubDiscussionCategoryId = valueOrFileInDir(
    flags,
    "github-discussion-category-id",
    "github-discussion-category-id-file",
    secretsDir,
    "github-discussion-category-id.txt",
  );
  const anthropicApiKey = valueOrFileInDir(
    flags,
    "anthropic-key",
    "anthropic-key-file",
    secretsDir,
    "anthropic.key",
  );
  const openRouterApiKey = valueOrFileInDir(
    flags,
    "openrouter-key",
    "openrouter-key-file",
    secretsDir,
    "openrouter.key",
  );
  const privateOaiCompatApiKey = valueOrFileInDir(
    flags,
    "private-key",
    "private-key-file",
    secretsDir,
    "private-oai.key",
  );
  const privateOaiCompatBaseUrl = valueOrFileInDir(
    flags,
    "private-base-url",
    "private-base-url-file",
    secretsDir,
    "private-base-url.txt",
  );
  const privateOaiCompatModel = valueOrFileInDir(
    flags,
    "private-model",
    "private-model-file",
    secretsDir,
    "private-model.txt",
  );
  const privateOaiCompatContextWindow = valueOrFileInDir(
    flags,
    "private-context-window",
    "private-context-window-file",
    secretsDir,
    "private-context-window.txt",
  );
  const setupDir = value(flags, "setup-dir");
  const providerProfilesPath =
    value(flags, "provider-profiles-path") ??
    (setupDir === undefined ? undefined : join(setupDir, "provider-profiles.json"));
  const credentialsPath =
    value(flags, "credentials-path") ??
    (setupDir === undefined ? undefined : join(setupDir, "credentials.enc"));
  const credentialsMasterKey = valueOrFileInDir(
    flags,
    "credential-master-key",
    "credential-master-key-file",
    secretsDir,
    "credential-master.key",
  );
  const internalApiCredentialName =
    value(flags, "internal-credential-name") ??
    (setupDir === undefined ? undefined : "INTERNAL_API_TOKEN");
  const internalApiCredentialValue = valueOrFileInDir(
    flags,
    "internal-token",
    "internal-token-file",
    secretsDir,
    "internal-api.token",
  );
  const internalApiHealthUrl = valueOrFileInDir(
    flags,
    "internal-health-url",
    "internal-health-url-file",
    secretsDir,
    "internal-health-url.txt",
  );
  const v1EvidencePath =
    value(flags, "evidence-path") ??
    (setupDir === undefined ? undefined : join(setupDir, "v1-evidence.json"));
  if (agentRepoName !== undefined) {
    fillValues.agentRepoName = agentRepoName;
  }
  if (worldRepoName !== undefined) {
    fillValues.worldRepoName = worldRepoName;
  }
  if (canonicalWorldRef !== undefined) {
    fillValues.canonicalWorldRef = canonicalWorldRef;
  }
  if (privateWorldRef !== undefined) {
    fillValues.privateWorldRef = privateWorldRef;
  }
  if (githubToken !== undefined) {
    fillValues.githubToken = githubToken;
  }
  if (githubOwner !== undefined) {
    fillValues.githubOwner = githubOwner;
  }
  if (githubRepositoryId !== undefined) {
    fillValues.githubRepositoryId = githubRepositoryId;
  }
  if (githubDiscussionCategoryId !== undefined) {
    fillValues.githubDiscussionCategoryId = githubDiscussionCategoryId;
  }
  if (anthropicApiKey !== undefined) {
    fillValues.anthropicApiKey = anthropicApiKey;
  }
  if (openRouterApiKey !== undefined) {
    fillValues.openRouterApiKey = openRouterApiKey;
  }
  if (privateOaiCompatApiKey !== undefined) {
    fillValues.privateOaiCompatApiKey = privateOaiCompatApiKey;
  }
  if (privateOaiCompatBaseUrl !== undefined) {
    fillValues.privateOaiCompatBaseUrl = privateOaiCompatBaseUrl;
  }
  if (privateOaiCompatModel !== undefined) {
    fillValues.privateOaiCompatModel = privateOaiCompatModel;
  }
  if (privateOaiCompatContextWindow !== undefined) {
    fillValues.privateOaiCompatContextWindow = privateOaiCompatContextWindow;
  }
  if (providerProfilesPath !== undefined) {
    fillValues.providerProfilesPath = providerProfilesPath;
  }
  if (credentialsPath !== undefined) {
    fillValues.credentialsPath = credentialsPath;
  }
  if (credentialsMasterKey !== undefined) {
    fillValues.credentialsMasterKey = credentialsMasterKey;
  }
  if (internalApiCredentialName !== undefined) {
    fillValues.internalApiCredentialName = internalApiCredentialName;
  }
  if (internalApiCredentialValue !== undefined) {
    fillValues.internalApiCredentialValue = internalApiCredentialValue;
  }
  if (internalApiHealthUrl !== undefined) {
    fillValues.internalApiHealthUrl = internalApiHealthUrl;
  }
  if (v1EvidencePath !== undefined) {
    fillValues.v1EvidencePath = v1EvidencePath;
  }
  return fillValues;
}

function hasConnectFillValues(values: Partial<Record<keyof ConnectFillValues, string>>): boolean {
  return Object.keys(values).length > 0;
}

function integerFlag(flags: FlagMap, name: string): number | undefined {
  const raw = value(flags, name);
  if (raw === undefined) {
    return undefined;
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    usage(`--${name} must be an integer`);
  }
  return parsed;
}

function booleanFlag(flags: FlagMap, name: string): boolean {
  return flags.has(name);
}

function hasHelpRequest(argv: readonly string[]): boolean {
  return argv.includes("--help") || argv.includes("-h");
}

function stripEnvQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function interpolateEnvValue(
  value: string,
  env: Readonly<Record<string, string | undefined>>,
): string {
  return value.replace(
    /\$(?:{([A-Za-z_][A-Za-z0-9_]*)}|([A-Za-z_][A-Za-z0-9_]*))/g,
    (_match, braced: string | undefined, bare: string | undefined) => {
      const name = braced ?? bare;
      return name === undefined ? "" : (env[name] ?? "");
    },
  );
}

function readEnvFile(
  path: string,
  baseEnv: Readonly<Record<string, string | undefined>>,
  missingNextCommands: readonly string[] = [
    `vivarium connect init --path ${shellQuote(path)}`,
    "vivarium help",
  ],
): Readonly<Record<string, string | undefined>> {
  const env: Record<string, string | undefined> = { ...baseEnv };
  if (!existsSync(path)) {
    usage(`Missing env file: ${path}`, missingNextCommands);
  }
  const body = readFileSync(path, "utf8");

  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }

    const assignment = trimmed.startsWith("export ")
      ? trimmed.slice("export ".length).trim()
      : trimmed;
    const separator = assignment.indexOf("=");
    if (separator < 1) {
      usage(`Invalid env file line in ${path}: ${line}`);
    }

    const name = assignment.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      usage(`Invalid env var name in ${path}: ${name}`);
    }

    const value = stripEnvQuotes(assignment.slice(separator + 1).trim());
    env[name] = interpolateEnvValue(value, env);
  }

  return env;
}

function withDefaultFlag(flags: FlagMap, name: string, defaultValue: string | undefined): FlagMap {
  if (defaultValue === undefined || flags.has(name)) {
    return flags;
  }

  const next = new Map(flags);
  next.set(name, [defaultValue]);
  return next;
}

function defaultVivariumHome(env: Readonly<Record<string, string | undefined>> | undefined): string {
  return env?.HOME ?? process.env.HOME ?? homedir();
}

function configuredVivariumHome(env: Readonly<Record<string, string | undefined>> | undefined): string | undefined {
  return env === undefined ? process.env.HOME ?? homedir() : env.HOME;
}

function privateDefaultLiveEnvFile(env: Readonly<Record<string, string | undefined>> | undefined): string | undefined {
  const home = configuredVivariumHome(env);
  return home === undefined ? undefined : join(home, ".vivarium", "live", "live-readiness.local.env");
}

function defaultBunCommand(env: Readonly<Record<string, string | undefined>> | undefined): string {
  const configured = env?.VIVARIUM_BUN_PATH ?? process.env.VIVARIUM_BUN_PATH;
  return configured === undefined || configured.length === 0 ? process.execPath : configured;
}

function isDefaultLiveEnvFile(path: string): boolean {
  return path === "live-readiness.local.env" || path.endsWith("/.vivarium/live/live-readiness.local.env");
}

function existingDefaultLiveEnvFile(env: Readonly<Record<string, string | undefined>> | undefined): string | undefined {
  const privateDefault = privateDefaultLiveEnvFile(env);
  if (privateDefault !== undefined && existsSync(privateDefault)) {
    return privateDefault;
  }

  const localDefault = "live-readiness.local.env";
  if (existsSync(localDefault)) {
    return localDefault;
  }

  return undefined;
}

type LocalStateSeedStatus = "seeded" | "unseeded" | "invalid";

function localStateSeedStatus(statePath: string): LocalStateSeedStatus {
  if (!existsSync(statePath)) {
    return "unseeded";
  }

  let state: SQLiteStateRepository | undefined;
  try {
    state = new SQLiteStateRepository(statePath);
    const identity = state.getIdentity();
    const hasIdentity = identity !== undefined && identity.name.trim().length > 0;
    const hasStarterSkill = state.listLocalSkills().some(
      (skill) =>
        skill.status === "promoted" &&
        skill.domain.trim().length > 0 &&
        skill.body.trim().length > 0,
    );
    return hasIdentity && hasStarterSkill ? "seeded" : "unseeded";
  } catch {
    return "invalid";
  } finally {
    state?.close();
  }
}

function bootstrapLocalRunState(options: {
  readonly statePath: string;
  readonly domain: string | undefined;
  readonly agentName: string | undefined;
  readonly worldRoot: string | undefined;
  readonly liveEnvPath: string | undefined;
}): void {
  const stateStatus = localStateSeedStatus(options.statePath);
  if (stateStatus === "invalid") {
    localStateInvalidUsage(options.statePath);
  }

  if (stateStatus === "unseeded") {
    runInitCommand({
      primaryDomain: options.domain ?? "coding",
      bindGithubIdentity: false,
      ...(options.agentName === undefined ? {} : { agentName: options.agentName }),
      ...(options.worldRoot === undefined ? {} : { worldRoot: options.worldRoot }),
      statePath: options.statePath,
    });
  }

  if (options.liveEnvPath !== undefined && !existsSync(options.liveEnvPath)) {
    liveEnvInitCommand({ path: options.liveEnvPath });
  }
}

function localStateInvalidUsage(statePath: string): never {
  usage(
    `Local state is invalid: ${statePath}. Move the invalid local SQLite state aside, then run vivarium local to create a fresh local memory database.`,
    ["vivarium doctor", "vivarium local", "vivarium help"],
  );
}

function guardLocalSetupState(statePath: string): void {
  if (localStateSeedStatus(statePath) === "invalid") {
    localStateInvalidUsage(statePath);
  }
}

function writableDefaultLiveEnvFile(env: Readonly<Record<string, string | undefined>> | undefined): string {
  return existingDefaultLiveEnvFile(env) ?? "live-readiness.local.env";
}

const githubDefaultTokenEnv = "GITHUB_TOKEN";
const githubOwnerEnv = "VIVARIUM_GITHUB_OWNER";
const githubAgentRepoEnv = "VIVARIUM_AGENT_REPO_NAME";
const githubWorldRepoEnv = "VIVARIUM_WORLD_REPO_NAME";
const githubRepositoryIdEnv = "VIVARIUM_GITHUB_REPOSITORY_ID";
const githubDiscussionCategoryIdEnv = "VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID";
const githubDefaultDiscussionTitle = "RFC 0001: Phase 0 Bootstrap";
const githubDefaultSetupNextCommands = [
  "vivarium connect signup",
  "vivarium setup live",
  "vivarium connect",
] as const;

function isPlaceholderValue(value: string): boolean {
  return /^<[^>]+>$/.test(value.trim());
}

function githubCommandEnv(
  flags: FlagMap,
  options: CliDispatchOptions,
): Readonly<Record<string, string | undefined>> {
  const envFile = value(flags, "env-file") ?? existingDefaultLiveEnvFile(options.env);
  return envFile === undefined ? (options.env ?? process.env) : readEnvFile(envFile, options.env ?? process.env);
}

function flagOrEnvValue(
  flags: FlagMap,
  flagName: string,
  env: Readonly<Record<string, string | undefined>>,
  envName: string,
): string | undefined {
  const explicit = value(flags, flagName)?.trim();
  if (explicit !== undefined && explicit.length > 0) {
    return explicit;
  }

  const fallback = env[envName]?.trim();
  if (fallback === undefined || fallback.length === 0 || isPlaceholderValue(fallback)) {
    return undefined;
  }

  return fallback;
}

function requiredGithubFlagOrEnv(
  flags: FlagMap,
  flagName: string,
  env: Readonly<Record<string, string | undefined>>,
  envName: string,
  label: string,
): string {
  return (
    flagOrEnvValue(flags, flagName, env, envName) ??
    usage(
      `Missing GitHub ${label}. Run vivarium connect signup, fill the generated local file, then rerun vivarium setup live.`,
      githubDefaultSetupNextCommands,
    )
  );
}

function githubTokenEnv(flags: FlagMap): string {
  return value(flags, "token-env") ?? githubDefaultTokenEnv;
}

function githubRepoEnvForTarget(flags: FlagMap): string {
  const target = value(flags, "target") ?? "world";
  if (target === "agent") {
    return githubAgentRepoEnv;
  }
  if (target === "world") {
    return githubWorldRepoEnv;
  }

  usage('Invalid GitHub --target. Use "agent" or "world".');
}

function githubDiscussionBody(flags: FlagMap): string {
  const explicit = value(flags, "body");
  if (explicit !== undefined) {
    return explicit;
  }

  usage(
    "Missing GitHub discussion body. Pass --body with the reviewed discussion text.",
    githubDefaultSetupNextCommands,
  );
}

function dispatchConnectWizard(
  command: CliCommand,
  flags: FlagMap,
  options: CliDispatchOptions,
  defaults: {
    readonly path?: string;
    readonly resumeCommand?: string;
    readonly setupDir?: string;
    readonly secretsDir?: string;
  } = {},
): CliDispatchResult {
  let wizardFlags = withDefaultFlag(flags, "setup-dir", defaults.setupDir);
  wizardFlags = withDefaultFlag(wizardFlags, "secrets-dir", defaults.secretsDir);
  wizardFlags = withDefaultFlag(wizardFlags, "path", defaults.path);

  const githubOwner = value(wizardFlags, "github-owner");
  const agentRepo = value(wizardFlags, "agent-repo");
  const worldRepo = value(wizardFlags, "world-repo");
  const canonicalWorldRef = value(wizardFlags, "canonical-world-ref");
  const privateWorldRef = value(wizardFlags, "private-world-ref");
  const wizardEnvFile = value(wizardFlags, "path") ?? value(wizardFlags, "env-file") ?? "live-readiness.local.env";
  const setupDir = value(wizardFlags, "setup-dir");
  const secretFiles = scaffoldSecretFiles(value(wizardFlags, "secrets-dir"), defaults.resumeCommand);
  const fillValues = connectFillValuesFromFlags(wizardFlags);
  const initResult =
    existsSync(wizardEnvFile) && !booleanFlag(wizardFlags, "overwrite")
      ? undefined
      : liveEnvInitCommand({
          path: wizardEnvFile,
          overwrite: booleanFlag(wizardFlags, "overwrite"),
          prefill: {
            ...(githubOwner === undefined ? {} : { githubOwner }),
            ...(agentRepo === undefined ? {} : { agentRepo }),
            ...(worldRepo === undefined ? {} : { worldRepo }),
            ...(canonicalWorldRef === undefined ? {} : { canonicalWorldRef }),
            ...(privateWorldRef === undefined ? {} : { privateWorldRef }),
          },
        });
  const fillResult =
    initResult?.ok === false || !hasConnectFillValues(fillValues)
      ? undefined
      : connectFillCommand({
          envFilePath: wizardEnvFile,
          values: fillValues,
        });
  const setupResult =
    booleanFlag(wizardFlags, "confirm-write") &&
    initResult?.ok !== false &&
    fillResult?.ok !== false
      ? liveSetupCommand({
          env: readEnvFile(wizardEnvFile, options.env ?? process.env),
          confirmWrite: true,
        })
      : undefined;
  const result = connectWizardCommand(
    initResult === undefined
      ? {
          envFilePath: wizardEnvFile,
          setupFileStatus: "existing",
          ...(setupDir === undefined ? {} : { setupDir }),
          ...(secretFiles === undefined ? {} : { secretFiles }),
          ...(fillResult === undefined ? {} : { fillResult }),
          ...(setupResult === undefined ? {} : { setupResult }),
        }
      : initResult.ok
        ? {
            envFilePath: initResult.path,
            setupFileStatus: "created",
            ...(setupDir === undefined ? {} : { setupDir }),
            mode: initResult.mode,
            templatePath: initResult.templatePath,
            prefilled: initResult.prefilled,
            ...(secretFiles === undefined ? {} : { secretFiles }),
            ...(fillResult === undefined ? {} : { fillResult }),
            ...(setupResult === undefined ? {} : { setupResult }),
          }
        : {
            envFilePath: initResult.path,
            setupFileStatus: "blocked",
            error: initResult.error,
          },
  );
  return { command, result, output: renderConnectWizardCommandResult(result) };
}

export async function dispatchCliCommand(
  argv: readonly string[],
  options: CliDispatchOptions = {},
): Promise<CliDispatchResult> {
  const [command, subcommand, ...rest] = argv;
  if (command === undefined || command === "--help" || command === "-h") {
    const result = helpCommand();
    return { command: "help", result, output: renderHelpCommandResult(result) };
  }

  if (command === "local" && subcommand === "run" && hasHelpRequest(rest)) {
    const result = localRunHelpCommand();
    return { command: "help", result, output: renderLocalRunHelpCommandResult(result) };
  }

  const commandArgs = (subcommand?.startsWith("--") ?? true) ? argv.slice(1) : rest;
  const { flags } = parseFlags(commandArgs);
  if (flags.has("help") || flags.has("h")) {
    const result = helpCommand();
    return { command: "help", result, output: renderHelpCommandResult(result) };
  }

  switch (command) {
    case "help": {
      const result = helpCommand();
      return { command, result, output: renderHelpCommandResult(result) };
    }
    case "launch": {
      if (subcommand !== "handoff") {
        usage('Unknown launch subcommand. Use "handoff".');
      }
      const owner = value(flags, "owner");
      const repo = value(flags, "repo");
      const explicitRef = value(flags, "ref");
      const explicitScriptRef = value(flags, "script-ref");
      const daemonHost = value(flags, "daemon-host");
      const daemonPort = value(flags, "daemon-port");
      const detectedRef =
        explicitRef === undefined && explicitScriptRef === undefined
          ? currentPreMainCheckoutRef(process.cwd())
          : undefined;
      const ref = explicitRef ?? detectedRef?.ref;
      const scriptRef = explicitScriptRef ?? detectedRef?.scriptRef;
      const result = launchHandoffCommand({
        ...(owner === undefined ? {} : { owner }),
        ...(repo === undefined ? {} : { repo }),
        ...(ref === undefined ? {} : { ref }),
        ...(scriptRef === undefined ? {} : { scriptRef }),
        ...(daemonHost === undefined ? {} : { daemonHost }),
        ...(daemonPort === undefined ? {} : { daemonPort }),
      });
      return { command, result, output: renderLaunchHandoffCommandResult(result) };
    }
    case "init": {
      const worldRoot = value(flags, "world-root");
      const statePath = value(flags, "state-path") ?? defaultStatePath(options.env);
      const agentName = value(flags, "agent-name");
      guardLocalSetupState(statePath);
      const result = runInitCommand({
        primaryDomain: value(flags, "domain") ?? value(flags, "primary-domain") ?? "coding",
        bindGithubIdentity: booleanFlag(flags, "bind-github"),
        ...(agentName === undefined ? {} : { agentName }),
        providerProfiles: values(flags, "provider"),
        credentialNames: values(flags, "credential"),
        ...(worldRoot === undefined ? {} : { worldRoot }),
        statePath,
      });
      return { command, result, output: renderInitCommandResult(result) };
    }
    case "onboard": {
      if (subcommand === "live") {
        const home = defaultVivariumHome(options.env);
        const setupDir = value(flags, "setup-dir") ?? join(home, ".vivarium", "live");
        return dispatchConnectWizard(command, flags, options, {
          path: join(setupDir, "live-readiness.local.env"),
          resumeCommand: setupLiveResumeCommand(flags),
          setupDir,
          secretsDir: join(home, ".vivarium", "secrets"),
        });
      }

      const worldRoot = value(flags, "world-root");
      const statePath = value(flags, "state-path") ?? defaultStatePath(options.env);
      const agentName = value(flags, "agent-name");
      const liveEnvPath = value(flags, "live-env-path") ?? privateDefaultLiveEnvFile(options.env);
      const githubOwner = value(flags, "github-owner");
      const agentRepo = value(flags, "agent-repo");
      const worldRepo = value(flags, "world-repo");
      const canonicalWorldRef = value(flags, "canonical-world-ref");
      const privateWorldRef = value(flags, "private-world-ref");
      guardLocalSetupState(statePath);
      const result = setupCommand({
        primaryDomain: value(flags, "domain") ?? value(flags, "primary-domain") ?? "coding",
        ...(agentName === undefined ? {} : { agentName }),
        ...(worldRoot === undefined ? {} : { worldRoot }),
        statePath,
        quick: true,
        ...(liveEnvPath === undefined ? {} : { liveEnvPath }),
        prefill: {
          ...(githubOwner === undefined ? {} : { githubOwner }),
          ...(agentRepo === undefined ? {} : { agentRepo }),
          ...(worldRepo === undefined ? {} : { worldRepo }),
          ...(canonicalWorldRef === undefined ? {} : { canonicalWorldRef }),
          ...(privateWorldRef === undefined ? {} : { privateWorldRef }),
        },
      });
      return { command, result, output: renderSetupCommandResult(result) };
    }
    case "local": {
      if (subcommand === undefined || subcommand.startsWith("--")) {
        const worldRoot = value(flags, "world-root");
        const statePath = value(flags, "state-path") ?? defaultStatePath(options.env);
        const agentName = value(flags, "agent-name");
        const liveEnvPath = value(flags, "live-env-path") ?? privateDefaultLiveEnvFile(options.env);
        const githubOwner = value(flags, "github-owner");
        const agentRepo = value(flags, "agent-repo");
        const worldRepo = value(flags, "world-repo");
        const canonicalWorldRef = value(flags, "canonical-world-ref");
        const privateWorldRef = value(flags, "private-world-ref");
        guardLocalSetupState(statePath);
        const result = setupCommand({
          primaryDomain: value(flags, "domain") ?? value(flags, "primary-domain") ?? "coding",
          ...(agentName === undefined ? {} : { agentName }),
          ...(worldRoot === undefined ? {} : { worldRoot }),
          statePath,
          quick: true,
          ...(liveEnvPath === undefined ? {} : { liveEnvPath }),
          prefill: {
            ...(githubOwner === undefined ? {} : { githubOwner }),
            ...(agentRepo === undefined ? {} : { agentRepo }),
            ...(worldRepo === undefined ? {} : { worldRepo }),
            ...(canonicalWorldRef === undefined ? {} : { canonicalWorldRef }),
            ...(privateWorldRef === undefined ? {} : { privateWorldRef }),
          },
        });
        return { command, result, output: renderSetupCommandResult(result) };
      }

      if (subcommand === "run") {
        const domain = value(flags, "domain");
        const agentName = value(flags, "agent-name");
        const worldRoot = value(flags, "world-root");
        const worldSubscriptionsPath = value(flags, "world-subscriptions-path");
        const explicitStatePath = value(flags, "state-path");
        const explicitLiveEnvPath = value(flags, "live-env-path");
        const statePath = explicitStatePath ?? defaultStatePath(options.env);
        const liveEnvPath = explicitLiveEnvPath ?? privateDefaultLiveEnvFile(options.env);
        const providerKind = value(flags, "provider-kind") as RunProviderKind | undefined;
        const providerApiKeyEnv = value(flags, "provider-api-key-env");
        const providerModel = value(flags, "provider-model");
        const providerBaseUrl = value(flags, "provider-base-url");
        const providerProfilesPath = value(flags, "provider-profiles-path");
        const providerProfile = value(flags, "provider-profile");
        const availableToolsets = values(flags, "available-toolset");
        const availableTools = values(flags, "available-tool");
        bootstrapLocalRunState({ statePath, domain, agentName, worldRoot, liveEnvPath });
        const result = await runCommand({
          goal: value(flags, "goal") ?? "build a tiny local agent",
          ...(agentName === undefined ? {} : { agentName }),
          ...(domain === undefined ? {} : { domain }),
          ...(worldRoot === undefined ? {} : { worldRoot }),
          ...(worldSubscriptionsPath === undefined ? {} : { worldSubscriptionsPath }),
          ...(statePath === undefined ? {} : { statePath }),
          statusCommand: statusCommandForRun(explicitStatePath, explicitLiveEnvPath),
          ...(booleanFlag(flags, "force-failure") ? { forceFailure: true } : {}),
          ...(providerKind === undefined ? {} : { providerKind }),
          ...(providerApiKeyEnv === undefined ? {} : { providerApiKeyEnv }),
          ...(providerModel === undefined ? {} : { providerModel }),
          ...(providerBaseUrl === undefined ? {} : { providerBaseUrl }),
          ...(providerProfilesPath === undefined ? {} : { providerProfilesPath }),
          ...(providerProfile === undefined ? {} : { providerProfile }),
          ...(availableToolsets.length === 0 ? {} : { availableToolsets }),
          ...(availableTools.length === 0 ? {} : { availableTools }),
        });
        return { command, result, output: renderRunCommandResult(result) };
      }

      usage('Unknown local subcommand. Use "run" or pass setup flags.');
    }
    case "setup": {
      if (subcommand === "live") {
        const home = defaultVivariumHome(options.env);
        const setupDir = value(flags, "setup-dir") ?? join(home, ".vivarium", "live");
        return dispatchConnectWizard(command, flags, options, {
          path: join(setupDir, "live-readiness.local.env"),
          resumeCommand: setupLiveResumeCommand(flags),
          setupDir,
          secretsDir: join(home, ".vivarium", "secrets"),
        });
      }

      const worldRoot = value(flags, "world-root");
      const statePath = value(flags, "state-path") ?? defaultStatePath(options.env);
      const agentName = value(flags, "agent-name");
      const envFile = value(flags, "env-file");
      const liveEnvPath = value(flags, "live-env-path") ?? privateDefaultLiveEnvFile(options.env);
      const githubOwner = value(flags, "github-owner");
      const agentRepo = value(flags, "agent-repo");
      const worldRepo = value(flags, "world-repo");
      const canonicalWorldRef = value(flags, "canonical-world-ref");
      const privateWorldRef = value(flags, "private-world-ref");
      guardLocalSetupState(statePath);
      const result = setupCommand({
        primaryDomain: value(flags, "domain") ?? value(flags, "primary-domain") ?? "coding",
        ...(agentName === undefined ? {} : { agentName }),
        ...(worldRoot === undefined ? {} : { worldRoot }),
        statePath,
        ...(booleanFlag(flags, "quick") ? { quick: true } : {}),
        ...(liveEnvPath === undefined ? {} : { liveEnvPath }),
        prefill: {
          ...(githubOwner === undefined ? {} : { githubOwner }),
          ...(agentRepo === undefined ? {} : { agentRepo }),
          ...(worldRepo === undefined ? {} : { worldRepo }),
          ...(canonicalWorldRef === undefined ? {} : { canonicalWorldRef }),
          ...(privateWorldRef === undefined ? {} : { privateWorldRef }),
        },
        ...(envFile === undefined
          ? {}
          : {
              envFilePath: envFile,
              env: readEnvFile(envFile, options.env ?? process.env),
            }),
        ...(booleanFlag(flags, "confirm-write") ? { confirmWrite: true } : {}),
      });
      return { command, result, output: renderSetupCommandResult(result) };
    }
    case "model": {
      const profilesPath = value(flags, "profiles-path");
      const explicitEnvFile = value(flags, "env-file");
      const envFile =
        explicitEnvFile ?? (profilesPath === undefined ? existingDefaultLiveEnvFile(options.env) : undefined);
      const env =
        envFile === undefined
          ? (options.env ?? process.env)
          : readEnvFile(envFile, options.env ?? process.env);
      const result = modelCommand({
        ...(profilesPath === undefined ? {} : { profilesPath }),
        env,
      });
      return {
        command,
        result,
        output: renderModelCommandResult(
          result,
          {
            ...(envFile === undefined ? {} : { envFilePath: envFile }),
            ...(booleanFlag(flags, "details") || booleanFlag(flags, "verbose")
              ? { showDetails: true }
              : {}),
          },
        ),
      };
    }
    case "connect": {
      const connectSubcommand = subcommand?.startsWith("--") === true ? undefined : subcommand;
      const explicitEnvFile = value(flags, "env-file");
      const envFile = explicitEnvFile ?? existingDefaultLiveEnvFile(options.env);
      const writableEnvFile = explicitEnvFile ?? writableDefaultLiveEnvFile(options.env);
      const showDetails = booleanFlag(flags, "details") || booleanFlag(flags, "verbose");
      if (connectSubcommand === "init") {
        const githubOwner = value(flags, "github-owner");
        const agentRepo = value(flags, "agent-repo");
        const worldRepo = value(flags, "world-repo");
        const canonicalWorldRef = value(flags, "canonical-world-ref");
        const privateWorldRef = value(flags, "private-world-ref");
        const result = liveEnvInitCommand({
          path: value(flags, "path") ?? "live-readiness.local.env",
          overwrite: booleanFlag(flags, "overwrite"),
          prefill: {
            ...(githubOwner === undefined ? {} : { githubOwner }),
            ...(agentRepo === undefined ? {} : { agentRepo }),
            ...(worldRepo === undefined ? {} : { worldRepo }),
            ...(canonicalWorldRef === undefined ? {} : { canonicalWorldRef }),
            ...(privateWorldRef === undefined ? {} : { privateWorldRef }),
          },
        });
        return { command, result, output: renderConnectInitCommandResult(result) };
      }
      if (connectSubcommand === "signup") {
        const result = connectSignupCommand();
        return { command, result, output: renderConnectSignupCommandResult(result) };
      }
      if (connectSubcommand === "wizard") {
        return dispatchConnectWizard(command, flags, options, { path: writableEnvFile });
      }
      if (connectSubcommand === "setup") {
        const setupEnvFile = writableEnvFile;
        const result = liveSetupCommand({
          env: readEnvFile(setupEnvFile, options.env ?? process.env),
          confirmWrite: booleanFlag(flags, "confirm-write"),
        });
        return {
          command,
          result,
          output:
            result.ok || result.requiresConfirmation === true
              ? renderLiveSetupCommandResult(result, { envFilePath: setupEnvFile })
              : renderConnectSetupCommandResult(result, { envFilePath: setupEnvFile, showDetails }),
        };
      }
      if (connectSubcommand === "fill") {
        const fillEnvFile = writableEnvFile;
        const fillValues = connectFillValuesFromFlags(flags);
        const result = connectFillCommand({
          envFilePath: fillEnvFile,
          values: fillValues,
        });
        return {
          command,
          result,
          output: renderConnectFillCommandResult(result, { showDetails }),
        };
      }
      if (connectSubcommand === "smoke") {
        const smokeEnvFile = writableEnvFile;
        const result = await connectSmokeCommand({
          env: readEnvFile(
            smokeEnvFile,
            options.env ?? process.env,
            isDefaultLiveEnvFile(smokeEnvFile)
              ? [
                  "vivarium setup live",
                  "vivarium connect",
                  "vivarium connect smoke",
                  "vivarium help",
                ]
              : [
                  `vivarium connect init --path ${shellQuote(smokeEnvFile)}`,
                  "vivarium help",
                ],
          ),
          ...(options.providerFetch === undefined ? {} : { providerFetch: options.providerFetch }),
          ...(options.credentialFetch === undefined ? {} : { credentialFetch: options.credentialFetch }),
        });
        return {
          command,
          result,
          output: renderConnectSmokeCommandResult(result, { envFilePath: smokeEnvFile, showDetails }),
        };
      }
      if (connectSubcommand !== undefined) {
        usage('Unknown connect subcommand. Use "wizard", "init", "signup", "fill", "setup", "smoke", or pass --env-file.');
      }
      const env =
        envFile === undefined
          ? undefined
          : readEnvFile(envFile, options.env ?? process.env);
      const result = connectCommand({
        showDetails,
        ...(envFile === undefined ? {} : { envFilePath: envFile }),
        ...(env === undefined ? {} : { env }),
        pathExists: existsSync,
      });
      return { command, result, output: renderConnectCommandResult(result) };
    }
    case "proof": {
      const envFile = value(flags, "env-file") ?? writableDefaultLiveEnvFile(options.env);
      const showDetails = booleanFlag(flags, "details") || booleanFlag(flags, "verbose");
      if (subcommand === "init") {
        const env = existsSync(envFile) ? readEnvFile(envFile, options.env ?? process.env) : undefined;
        const result = proofInitCommand({
          envFilePath: envFile,
          showDetails,
          overwrite: booleanFlag(flags, "overwrite"),
          ...(env === undefined ? {} : { env }),
        });
        return { command, result, output: renderProofInitCommandResult(result) };
      }
      if (subcommand !== undefined && !subcommand.startsWith("--")) {
        usage('Unknown proof subcommand. Use "init" or pass --env-file.');
      }
      const env = existsSync(envFile) ? readEnvFile(envFile, options.env ?? process.env) : undefined;
      const result = proofCommand({
        envFilePath: envFile,
        showDetails,
        ...(env === undefined ? {} : { env }),
        pathExists: existsSync,
      });
      return { command, result, output: renderProofCommandResult(result) };
    }
    case "run": {
      const domain = value(flags, "domain");
      const agentName = value(flags, "agent-name");
      const worldRoot = value(flags, "world-root");
      const worldSubscriptionsPath = value(flags, "world-subscriptions-path");
      const statePath = value(flags, "state-path");
      const liveEnvPath = value(flags, "live-env-path");
      const providerKind = value(flags, "provider-kind") as RunProviderKind | undefined;
      const providerApiKeyEnv = value(flags, "provider-api-key-env");
      const providerModel = value(flags, "provider-model");
      const providerBaseUrl = value(flags, "provider-base-url");
      const providerProfilesPath = value(flags, "provider-profiles-path");
      const providerProfile = value(flags, "provider-profile");
      const availableToolsets = values(flags, "available-toolset");
      const availableTools = values(flags, "available-tool");
      const result = await runCommand({
        goal: required(flags, "goal"),
        ...(agentName === undefined ? {} : { agentName }),
        ...(domain === undefined ? {} : { domain }),
        ...(worldRoot === undefined ? {} : { worldRoot }),
        ...(worldSubscriptionsPath === undefined ? {} : { worldSubscriptionsPath }),
        ...(statePath === undefined ? {} : { statePath }),
        statusCommand: statusCommandForRun(statePath, liveEnvPath),
        ...(booleanFlag(flags, "force-failure") ? { forceFailure: true } : {}),
        ...(providerKind === undefined ? {} : { providerKind }),
        ...(providerApiKeyEnv === undefined ? {} : { providerApiKeyEnv }),
        ...(providerModel === undefined ? {} : { providerModel }),
        ...(providerBaseUrl === undefined ? {} : { providerBaseUrl }),
        ...(providerProfilesPath === undefined ? {} : { providerProfilesPath }),
        ...(providerProfile === undefined ? {} : { providerProfile }),
        ...(availableToolsets.length === 0 ? {} : { availableToolsets }),
        ...(availableTools.length === 0 ? {} : { availableTools }),
      });
      return { command, result, output: renderRunCommandResult(result) };
    }
    case "credentials": {
      if (subcommand === "add") {
        const result = addCredentialCommand({
          credentialsPath: required(flags, "path", connectSetupNextCommands),
          masterKey: required(flags, "master-key", connectSetupNextCommands),
          kind: required(flags, "kind", connectSetupNextCommands) as CredentialKind,
          name: required(flags, "name", connectSetupNextCommands),
          purpose: required(flags, "purpose", connectSetupNextCommands),
          value: required(flags, "value", connectSetupNextCommands),
          scopes: values(flags, "scope"),
        });
        return { command, result, output: renderAddCredentialCommandResult(result) };
      }

      if (subcommand === "list") {
        const result = listCredentialsCommand({
          credentialsPath: required(flags, "path", connectSetupNextCommands),
          masterKey: required(flags, "master-key", connectSetupNextCommands),
        });
        return { command, result, output: renderListCredentialsCommandResult(result) };
      }

      if (subcommand === "smoke") {
        const method = value(flags, "method") as HttpMethod | undefined;
        const body = value(flags, "body");
        const result = await credentialSmokeCommand({
          credentialsPath: required(flags, "path", connectSmokeNextCommands),
          masterKey: required(flags, "master-key", connectSmokeNextCommands),
          name: required(flags, "name", connectSmokeNextCommands),
          url: required(flags, "url", connectSmokeNextCommands),
          ...(method === undefined ? {} : { method }),
          ...(body === undefined ? {} : { body }),
        });
        return { command, result, output: renderCredentialSmokeCommandResult(result) };
      }

      usage('Unknown credentials subcommand. Use "add", "list", or "smoke".');
    }
    case "skills":
      if (subcommand !== "list") {
        usage('Unknown skills subcommand. Use "list".');
      }
      {
        const domain = value(flags, "domain");
        const result = listSkillsCommand({
          statePath: required(flags, "state-path"),
          ...(domain === undefined ? {} : { domain }),
        });
        return { command, result, output: renderListSkillsCommandResult(result) };
      }
    case "world":
      if (subcommand === "subscribe") {
        const priority = integerFlag(flags, "priority");
        const ref = value(flags, "world-ref");
        const result = subscribeWorldCommand({
          subscriptionsPath: required(flags, "subscriptions-path"),
          root: required(flags, "world-root"),
          label: required(flags, "world-label"),
          ...(priority === undefined ? {} : { priority }),
          ...(ref === undefined ? {} : { ref }),
          ...(booleanFlag(flags, "auto-push") ? { autoPushEnabled: true } : {}),
        });
        return { command, result, output: renderWorldSubscriptionsCommandResult(result) };
      }

      if (subcommand === "subscriptions") {
        const result = listWorldSubscriptionsCommand({
          subscriptionsPath: required(flags, "subscriptions-path"),
        });
        return { command, result, output: renderWorldSubscriptionsCommandResult(result) };
      }

      if (subcommand === "pull") {
        const ref = value(flags, "ref");
        const result = await pullWorldCommand({
          remote: required(flags, "remote"),
          destination: required(flags, "destination"),
          ...(ref === undefined ? {} : { ref }),
        });
        return { command, result, output: renderPullWorldCommandResult(result) };
      }

      if (subcommand === "search") {
        const limit = integerFlag(flags, "limit");
        const worldRoots = values(flags, "world-root");
        const worldLabels = values(flags, "world-label");
        const subscriptionsPath = value(flags, "subscriptions-path");
        const availableToolsets = values(flags, "available-toolset");
        const availableTools = values(flags, "available-tool");
        if (worldLabels.length > 0 && worldLabels.length !== worldRoots.length) {
          usage("--world-label must be provided once for each --world-root");
        }
        const result = searchWorldCommand({
          ...(worldRoots.length > 1
            ? {
                worlds: worldRoots.map((root, index) => ({
                  root,
                  label: worldLabels[index] ?? `world-${index + 1}`,
                  priority: index,
                })),
              }
            : worldRoots.length === 1
              ? { worldRoot: worldRoots[0] as string }
              : subscriptionsPath === undefined
                ? { worldRoot: required(flags, "world-root") }
                : { subscriptionsPath }),
          domain: required(flags, "domain"),
          query: required(flags, "query"),
          ...(limit === undefined ? {} : { limit }),
          ...(availableToolsets.length === 0 ? {} : { availableToolsets }),
          ...(availableTools.length === 0 ? {} : { availableTools }),
        });
        return { command, result, output: renderSearchWorldCommandResult(result) };
      }

      if (subcommand === "transmission-smoke") {
        const ref = value(flags, "ref");
        const limit = integerFlag(flags, "limit");
        const result = await verifyWorldTransmissionCommand({
          remote: required(flags, "remote"),
          destination: required(flags, "destination"),
          domain: required(flags, "domain"),
          query: required(flags, "query"),
          ...(ref === undefined ? {} : { ref }),
          ...(limit === undefined ? {} : { limit }),
        });
        return { command, result, output: renderVerifyWorldTransmissionCommandResult(result) };
      }

      usage(
        'Unknown world subcommand. Use "search", "subscribe", "subscriptions", "pull", or "transmission-smoke".',
      );
    case "dream": {
      if (subcommand !== "run") {
        usage('Unknown dream subcommand. Use "run".');
      }
      const domain = value(flags, "domain");
      const result = dreamCommand({
        statePath: required(flags, "state-path"),
        ...(domain === undefined ? {} : { domain }),
      });
      return { command, result, output: renderDreamCommandResult(result) };
    }
    case "identity": {
      if (subcommand === "summary") {
        const result = identitySummaryCommand({ statePath: required(flags, "state-path") });
        return { command, result, output: renderIdentitySummaryCommandResult(result) };
      }

      if (subcommand === "stage") {
        const result = identityStageCommand({
          statePath: required(flags, "state-path"),
          domain: required(flags, "domain"),
        });
        return { command, result, output: renderIdentityStageCommandResult(result) };
      }

      if (subcommand === "history") {
        const limit = integerFlag(flags, "limit");
        const result = identityHistoryCommand({
          statePath: required(flags, "state-path"),
          ...(limit === undefined ? {} : { limit }),
        });
        return { command, result, output: renderIdentityHistoryCommandResult(result) };
      }

      usage('Unknown identity subcommand. Use "summary", "stage", or "history".');
    }
    case "curriculum": {
      if (subcommand === "read") {
        const result = curriculumReadCommand({
          worldRoot: required(flags, "world-root"),
          domain: required(flags, "domain"),
        });
        return { command, result, output: renderCurriculumReadCommandResult(result) };
      }

      if (subcommand === "progress") {
        const result = curriculumProgressCommand({
          statePath: required(flags, "state-path"),
          domain: required(flags, "domain"),
        });
        return { command, result, output: renderCurriculumProgressCommandResult(result) };
      }

      if (subcommand === "advance") {
        const stepIndex = integerFlag(flags, "step");
        if (stepIndex === undefined) {
          usage("Missing required --step");
        }
        const result = curriculumAdvanceCommand({
          statePath: required(flags, "state-path"),
          domain: required(flags, "domain"),
          stepIndex,
        });
        return { command, result, output: renderCurriculumProgressCommandResult(result) };
      }

      usage('Unknown curriculum subcommand. Use "read", "progress", or "advance".');
    }
    case "publish": {
      if (subcommand === "list") {
        const result = publishListCommand({ statePath: required(flags, "state-path") });
        return { command, result, output: renderPublishListCommandResult(result) };
      }

      if (subcommand === "run") {
        const result = publishRunCommand({
          statePath: required(flags, "state-path"),
          worldRoot: required(flags, "world-root"),
          worldSubscriptionsPath: required(flags, "world-subscriptions-path"),
          runId: required(flags, "run-id"),
          visibility: required(flags, "visibility") as Visibility,
          contributor: required(flags, "contributor"),
        });
        return { command, result, output: renderPublishRunCommandResult(result) };
      }

      if (subcommand === "trace") {
        const result = publishTraceCommand({
          statePath: required(flags, "state-path"),
          worldRoot: required(flags, "world-root"),
          worldSubscriptionsPath: required(flags, "world-subscriptions-path"),
          traceId: required(flags, "trace-id"),
          visibility: required(flags, "visibility") as Visibility,
          contributor: required(flags, "contributor"),
        });
        return { command, result, output: renderPublishTraceCommandResult(result) };
      }

      usage('Unknown publish subcommand. Use "list", "run", or "trace".');
    }
    case "providers": {
      if (subcommand === "configure") {
        const baseUrl = value(flags, "base-url");
        const contextWindow = integerFlag(flags, "context-window");
        if (contextWindow === undefined) {
          usage("Missing required --context-window", connectSetupNextCommands);
        }
        const result = configureProviderProfileCommand({
          profilesPath: required(flags, "profiles-path", connectSetupNextCommands),
          name: required(flags, "name", connectSetupNextCommands),
          kind: required(flags, "kind", connectSetupNextCommands) as ProviderSmokeKind,
          apiKeyEnv: required(flags, "api-key-env", connectSetupNextCommands),
          model: required(flags, "model", connectSetupNextCommands),
          ...(baseUrl === undefined ? {} : { baseUrl }),
          capabilities: values(flags, "capability") as readonly Capability[],
          contextWindow,
          costClass: required(flags, "cost-class", connectSetupNextCommands) as CostClass,
        });
        return { command, result, output: renderProviderProfilesCommandResult(result) };
      }

      if (subcommand === "list") {
        const result = listProviderProfilesCommand({
          profilesPath: required(flags, "profiles-path", connectSetupNextCommands),
        });
        return { command, result, output: renderProviderProfilesCommandResult(result) };
      }

      if (subcommand !== "smoke") {
        usage('Unknown providers subcommand. Use "configure", "list", or "smoke".');
      }
      const baseUrl = value(flags, "base-url");
      const prompt = value(flags, "prompt");
      const kind = value(flags, "kind") as ProviderSmokeKind | undefined;
      const apiKeyEnv = value(flags, "api-key-env");
      const model = value(flags, "model");
      const profilesPath = value(flags, "profiles-path");
      const profile = value(flags, "profile");
      const result = await providerSmokeCommand({
        ...(kind === undefined ? {} : { kind }),
        ...(apiKeyEnv === undefined ? {} : { apiKeyEnv }),
        ...(model === undefined ? {} : { model }),
        ...(baseUrl === undefined ? {} : { baseUrl }),
        ...(profilesPath === undefined ? {} : { profilesPath }),
        ...(profile === undefined ? {} : { profile }),
        ...(prompt === undefined ? {} : { prompt }),
      });
      return { command, result, output: renderProviderSmokeCommandResult(result) };
    }
    case "github": {
      const githubEnv = githubCommandEnv(flags, options);
      const owner = requiredGithubFlagOrEnv(
        flags,
        "owner",
        githubEnv,
        githubOwnerEnv,
        "owner",
      );
      const repo = requiredGithubFlagOrEnv(
        flags,
        "repo",
        githubEnv,
        githubRepoEnvForTarget(flags),
        "repository name",
      );
      const tokenEnv = githubTokenEnv(flags);
      if (subcommand === "smoke") {
        const result = await githubSmokeCommand({
          owner,
          repo,
          tokenEnv,
          env: githubEnv,
        });
        return { command, result, output: renderGitHubSmokeCommandResult(result) };
      }

      if (subcommand === "discussion") {
        const result = await githubDiscussionCommand({
          owner,
          repo,
          tokenEnv,
          repositoryId: requiredGithubFlagOrEnv(
            flags,
            "repository-id",
            githubEnv,
            githubRepositoryIdEnv,
            "repository ID",
          ),
          categoryId: requiredGithubFlagOrEnv(
            flags,
            "category-id",
            githubEnv,
            githubDiscussionCategoryIdEnv,
            "Discussion category ID",
          ),
          title: value(flags, "title") ?? githubDefaultDiscussionTitle,
          body: githubDiscussionBody(flags),
          confirmWrite: booleanFlag(flags, "confirm-write"),
          env: githubEnv,
        });
        return { command, result, output: renderGitHubDiscussionCommandResult(result) };
      }

      if (subcommand === "pull-request") {
        const result = await githubPullRequestCommand({
          owner,
          repo,
          tokenEnv,
          title: required(flags, "title"),
          body: required(flags, "body"),
          head: required(flags, "head"),
          base: required(flags, "base"),
          confirmWrite: booleanFlag(flags, "confirm-write"),
          env: githubEnv,
        });
        return { command, result, output: renderGitHubPullRequestCommandResult(result) };
      }

      if (subcommand === "workflow-runs") {
        const branch = value(flags, "branch");
        const limit = integerFlag(flags, "limit");
        const result = await githubWorkflowRunsCommand({
          owner,
          repo,
          tokenEnv,
          ...(branch === undefined ? {} : { branch }),
          ...(limit === undefined ? {} : { limit }),
          env: githubEnv,
        });
        return { command, result, output: renderGitHubWorkflowRunsCommandResult(result) };
      }

      usage(
        'Unknown github subcommand. Use "smoke", "discussion", "pull-request", or "workflow-runs".',
      );
    }
    case "daemon": {
      if (subcommand !== "smoke") {
        usage('Unknown daemon subcommand. Use "smoke".');
      }
      const statusUrl = value(flags, "status-url");
      const result = await daemonSmokeCommand(statusUrl === undefined ? {} : { statusUrl });
      return { command, result, output: renderDaemonSmokeCommandResult(result) };
    }
    case "live": {
      if (subcommand === "env-init") {
        const githubOwner = value(flags, "github-owner");
        const agentRepo = value(flags, "agent-repo");
        const worldRepo = value(flags, "world-repo");
        const canonicalWorldRef = value(flags, "canonical-world-ref");
        const privateWorldRef = value(flags, "private-world-ref");
        const result = liveEnvInitCommand({
          path: required(flags, "path"),
          overwrite: booleanFlag(flags, "overwrite"),
          prefill: {
            ...(githubOwner === undefined ? {} : { githubOwner }),
            ...(agentRepo === undefined ? {} : { agentRepo }),
            ...(worldRepo === undefined ? {} : { worldRepo }),
            ...(canonicalWorldRef === undefined ? {} : { canonicalWorldRef }),
            ...(privateWorldRef === undefined ? {} : { privateWorldRef }),
          },
        });
        return { command, result, output: renderLiveEnvInitCommandResult(result) };
      }

      if (subcommand === "evidence-init") {
        const result = liveEvidenceInitCommand({
          path: required(flags, "path"),
          overwrite: booleanFlag(flags, "overwrite"),
        });
        return { command, result, output: renderLiveEvidenceInitCommandResult(result) };
      }

      if (subcommand === "setup") {
        const envFile = required(flags, "env-file");
        const result = liveSetupCommand({
          env: readEnvFile(envFile, options.env ?? process.env),
          confirmWrite: booleanFlag(flags, "confirm-write"),
        });
        return { command, result, output: renderLiveSetupCommandResult(result, { envFilePath: envFile }) };
      }

      usage('Unknown live subcommand. Use "env-init", "setup", or "evidence-init".');
    }
    case "status": {
      const home = defaultVivariumHome(options.env);
      const statePath = value(flags, "state-path") ?? join(home, ".vivarium", "state.db");
      const liveEnvPath =
        value(flags, "live-env-path") ??
        value(flags, "env-file") ??
        join(home, ".vivarium", "live", "live-readiness.local.env");
      const result = statusCommand({
        statePath,
        liveEnvPath,
      });
      return { command, result, output: renderStatusCommandResult(result) };
    }
    case "update": {
      const result = updateCommand({
        agentRoot: value(flags, "agent-root") ?? process.cwd(),
        bunCommand: defaultBunCommand(options.env),
        ...(options.updateRunner === undefined ? {} : { runner: options.updateRunner }),
      });
      return { command, result, output: renderUpdateCommandResult(result) };
    }
    case "doctor": {
      const agentRoot = value(flags, "agent-root");
      const worldRoot = value(flags, "world-root");
      const statePath =
        value(flags, "state-path") ?? join(defaultVivariumHome(options.env), ".vivarium", "state.db");
      const liveMode = booleanFlag(flags, "live");
      const explicitEnvFile = value(flags, "env-file");
      const envFile =
        explicitEnvFile ?? (liveMode ? existingDefaultLiveEnvFile(options.env) : undefined);
      const env =
        envFile === undefined ? options.env : readEnvFile(envFile, options.env ?? process.env);
      const result = doctorCommand({
        ...(liveMode ? { mode: "live-readiness" } : {}),
        ...(agentRoot === undefined ? {} : { agentRoot }),
        ...(worldRoot === undefined ? {} : { worldRoot }),
        ...(liveMode ? {} : { statePath }),
        ...(options.doctorRunner === undefined ? {} : { runner: options.doctorRunner }),
        ...(env === undefined ? {} : { env }),
        ...(envFile === undefined ? {} : { envFilePath: envFile }),
      });
      return {
        command,
        result,
        output: renderDoctorCommandResult(result, {
          showDetails: booleanFlag(flags, "details") || booleanFlag(flags, "verbose"),
        }),
      };
    }
    default:
      usage(`Unknown command "${command}"`);
  }
}
