import { existsSync, readFileSync } from "node:fs";

export interface DoctorResult {
  readonly ok: boolean;
  readonly checks: readonly string[];
}

export interface DoctorCommandRun {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd?: string;
}

export interface DoctorCommandRunResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export type DoctorCommandRunner = (run: DoctorCommandRun) => DoctorCommandRunResult;

export interface DoctorCommandOptions {
  readonly mode?: "offline-local" | "live-readiness";
  readonly agentRoot?: string;
  readonly worldRoot?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly runner?: DoctorCommandRunner;
}

const providerEnvPrefixes = ["ANTHROPIC", "OPENAI", "OPENROUTER", "OAI"] as const;
const githubEnvNames = ["GITHUB_TOKEN", "GH_TOKEN"] as const;
const agentRepoNameEnv = "VIVARIUM_AGENT_REPO_NAME";
const worldRepoNameEnv = "VIVARIUM_WORLD_REPO_NAME";
const githubOwnerEnv = "VIVARIUM_GITHUB_OWNER";
const githubRepositoryIdEnv = "VIVARIUM_GITHUB_REPOSITORY_ID";
const githubDiscussionCategoryIdEnv = "VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID";
const worldSubscriptionsPathEnv = "VIVARIUM_WORLD_SUBSCRIPTIONS_PATH";
const canonicalWorldRefEnv = "VIVARIUM_CANONICAL_WORLD_REF";
const privateWorldRefEnv = "VIVARIUM_PRIVATE_WORLD_REF";
const providerProfilesPathEnv = "VIVARIUM_PROVIDER_PROFILES_PATH";
const anthropicProviderProfileEnv = "VIVARIUM_ANTHROPIC_PROVIDER_PROFILE";
const openRouterProviderProfileEnv = "VIVARIUM_OPENROUTER_PROVIDER_PROFILE";
const privateOaiCompatProviderProfileEnv = "VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE";
const anthropicApiKeyEnv = "ANTHROPIC_API_KEY";
const openRouterApiKeyEnv = "OPENROUTER_API_KEY";
const privateOaiCompatApiKeyEnv = "VIVARIUM_OAI_COMPAT_API_KEY";
const privateOaiCompatBaseUrlEnv = "VIVARIUM_OAI_COMPAT_BASE_URL";
const privateOaiCompatModelEnv = "VIVARIUM_OAI_COMPAT_MODEL";
const credentialsPathEnv = "VIVARIUM_CREDENTIALS_PATH";
const internalApiCredentialNameEnv = "VIVARIUM_INTERNAL_API_CREDENTIAL_NAME";
const internalApiHealthUrlEnv = "VIVARIUM_INTERNAL_API_HEALTH_URL";

function defaultRunner({ command, args, cwd }: DoctorCommandRun): DoctorCommandRunResult {
  try {
    const result = Bun.spawnSync([command, ...args], {
      ...(cwd === undefined ? {} : { cwd }),
      stdout: "pipe",
      stderr: "pipe",
    });
    return {
      exitCode: result.exitCode,
      stdout: result.stdout?.toString() ?? "",
      stderr: result.stderr?.toString() ?? "",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { exitCode: 127, stdout: "", stderr: message };
  }
}

function run(runner: DoctorCommandRunner, command: string, args: readonly string[], cwd?: string): DoctorCommandRunResult {
  return runner(cwd === undefined ? { command, args } : { command, args, cwd });
}

function remoteCheck(
  runner: DoctorCommandRunner,
  cwd: string,
  env: Readonly<Record<string, string | undefined>>,
  repoNameEnv: string,
  placeholder: string,
  label: string,
): string {
  const result = run(runner, "git", ["remote", "-v"], cwd);
  if (result.exitCode !== 0 || result.stdout.trim().length === 0) {
    return `${label}.remote:missing`;
  }

  const owner = env[githubOwnerEnv]?.trim();
  const repo = env[repoNameEnv]?.trim();
  if (owner === undefined || owner.length === 0 || repo === undefined || repo.length === 0 || repo === placeholder) {
    return `${label}.remote:configured`;
  }

  return result.stdout.includes(`${owner}/${repo}`) ? `${label}.remote:configured` : `${label}.remote:mismatch`;
}

function hasProviderEnv(env: Readonly<Record<string, string | undefined>>): boolean {
  return Object.entries(env).some(
    ([key, value]) => value !== undefined && value.length > 0 && providerEnvPrefixes.some((prefix) => key.startsWith(prefix)),
  );
}

function hasGithubEnv(env: Readonly<Record<string, string | undefined>>): boolean {
  return githubEnvNames.some((name) => {
    const value = env[name];
    return value !== undefined && value.length > 0;
  });
}

function repoNameCheck(env: Readonly<Record<string, string | undefined>>, envName: string, placeholder: string, label: string): string {
  const value = env[envName]?.trim();
  if (value === undefined || value.length === 0) {
    return `${label}.name:missing`;
  }

  return value === placeholder ? `${label}.name:placeholder` : `${label}.name:configured`;
}

function requiredEnvCheck(env: Readonly<Record<string, string | undefined>>, envName: string, label: string): string {
  const value = env[envName]?.trim();
  return value === undefined || value.length === 0 ? `${label}:missing` : `${label}:configured`;
}

function requiredFileCheck(env: Readonly<Record<string, string | undefined>>, envName: string, label: string): string {
  const value = env[envName]?.trim();
  if (value === undefined || value.length === 0) {
    return `${label}:missing`;
  }

  return existsSync(value) ? `${label}:configured` : `${label}:unavailable`;
}

function worldSubscriptionRefs(env: Readonly<Record<string, string | undefined>>): ReadonlySet<string> | undefined {
  const subscriptionsPath = env[worldSubscriptionsPathEnv]?.trim();
  if (subscriptionsPath === undefined || subscriptionsPath.length === 0 || !existsSync(subscriptionsPath)) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(readFileSync(subscriptionsPath, "utf8")) as { readonly worlds?: readonly { readonly ref?: unknown }[] };
    return new Set(
      (parsed.worlds ?? []).flatMap((world) => {
        const ref = typeof world.ref === "string" ? world.ref.trim() : "";
        return ref.length > 0 ? [ref] : [];
      }),
    );
  } catch {
    return new Set();
  }
}

function worldRefCheck(
  env: Readonly<Record<string, string | undefined>>,
  refs: ReadonlySet<string> | undefined,
  envName: string,
  label: string,
): string {
  const value = env[envName]?.trim();
  if (value === undefined || value.length === 0) {
    return `${label}:missing`;
  }

  return refs === undefined || refs.has(value) ? `${label}:configured` : `${label}:unavailable`;
}

function providerProfileNames(env: Readonly<Record<string, string | undefined>>): ReadonlySet<string> | undefined {
  const profilesPath = env[providerProfilesPathEnv]?.trim();
  if (profilesPath === undefined || profilesPath.length === 0 || !existsSync(profilesPath)) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(readFileSync(profilesPath, "utf8")) as { readonly profiles?: readonly { readonly name?: unknown }[] };
    return new Set((parsed.profiles ?? []).flatMap((profile) => (typeof profile.name === "string" ? [profile.name] : [])));
  } catch {
    return new Set();
  }
}

function providerProfileCheck(
  env: Readonly<Record<string, string | undefined>>,
  names: ReadonlySet<string> | undefined,
  envName: string,
  label: string,
): string {
  const value = env[envName]?.trim();
  if (value === undefined || value.length === 0) {
    return `${label}:missing`;
  }

  return names === undefined || names.has(value) ? `${label}:configured` : `${label}:unavailable`;
}

function hasRequiredEnv(env: Readonly<Record<string, string | undefined>>, envName: string): boolean {
  const value = env[envName]?.trim();
  return value !== undefined && value.length > 0;
}

function privateOaiCompatCheck(env: Readonly<Record<string, string | undefined>>): string {
  return hasRequiredEnv(env, privateOaiCompatApiKeyEnv) &&
    hasRequiredEnv(env, privateOaiCompatBaseUrlEnv) &&
    hasRequiredEnv(env, privateOaiCompatModelEnv)
    ? "provider.privateOaiCompat:configured"
    : "provider.privateOaiCompat:missing";
}

function githubAuthCheck(runner: DoctorCommandRunner): string {
  const result = run(runner, "gh", ["auth", "status"]);
  if (result.exitCode === 0) {
    return "github.auth:ok";
  }

  const output = `${result.stdout}\n${result.stderr}`;
  if (output.includes("invalid")) {
    return "github.auth:invalid";
  }

  return "github.auth:unavailable";
}

function dockerCheck(runner: DoctorCommandRunner): readonly string[] {
  const docker = run(runner, "docker", ["--version"]);
  const dockerStatus = docker.exitCode === 0 ? "docker:installed" : "docker:missing";
  const dockerCompose = run(runner, "docker", ["compose", "version"]);
  if (dockerCompose.exitCode === 0) {
    return [dockerStatus, "docker.compose:installed"];
  }

  const standaloneCompose = run(runner, "docker-compose", ["version"]);
  return [dockerStatus, standaloneCompose.exitCode === 0 ? "docker.compose:installed" : "docker.compose:missing"];
}

function liveReadinessDoctor(options: DoctorCommandOptions): DoctorResult {
  const runner = options.runner ?? defaultRunner;
  const env = options.env ?? process.env;
  const agentRoot = options.agentRoot ?? process.cwd();
  const worldRoot = options.worldRoot ?? process.cwd();
  const worldRefs = worldSubscriptionRefs(env);
  const profiles = providerProfileNames(env);
  const checks = [
    repoNameCheck(env, agentRepoNameEnv, "the-agent", "agent"),
    repoNameCheck(env, worldRepoNameEnv, "the-world", "world"),
    remoteCheck(runner, agentRoot, env, agentRepoNameEnv, "the-agent", "agent"),
    remoteCheck(runner, worldRoot, env, worldRepoNameEnv, "the-world", "world"),
    requiredFileCheck(env, worldSubscriptionsPathEnv, "world.subscriptionsPath"),
    worldRefCheck(env, worldRefs, canonicalWorldRefEnv, "world.canonicalRef"),
    worldRefCheck(env, worldRefs, privateWorldRefEnv, "world.privateForkRef"),
    hasProviderEnv(env) ? "provider.env:configured" : "provider.env:missing",
    requiredEnvCheck(env, anthropicApiKeyEnv, "provider.anthropic"),
    requiredEnvCheck(env, openRouterApiKeyEnv, "provider.openrouter"),
    privateOaiCompatCheck(env),
    requiredFileCheck(env, providerProfilesPathEnv, "provider.profilesPath"),
    providerProfileCheck(env, profiles, anthropicProviderProfileEnv, "provider.anthropicProfile"),
    providerProfileCheck(env, profiles, openRouterProviderProfileEnv, "provider.openrouterProfile"),
    providerProfileCheck(env, profiles, privateOaiCompatProviderProfileEnv, "provider.privateOaiCompatProfile"),
    requiredFileCheck(env, credentialsPathEnv, "credentials.path"),
    requiredEnvCheck(env, internalApiCredentialNameEnv, "internalApi.credentialName"),
    requiredEnvCheck(env, internalApiHealthUrlEnv, "internalApi.healthUrl"),
    hasGithubEnv(env) ? "github.env:configured" : "github.env:missing",
    requiredEnvCheck(env, githubOwnerEnv, "github.owner"),
    requiredEnvCheck(env, githubRepositoryIdEnv, "github.repositoryId"),
    requiredEnvCheck(env, githubDiscussionCategoryIdEnv, "github.discussionCategoryId"),
    githubAuthCheck(runner),
    ...dockerCheck(runner),
  ];

  return { ok: checks.every((check) => check.endsWith(":configured") || check.endsWith(":ok") || check.endsWith(":installed")), checks };
}

export function doctorCommand(options: DoctorCommandOptions = {}): DoctorResult {
  if (options.mode === "live-readiness") {
    return liveReadinessDoctor(options);
  }

  return {
    ok: true,
    checks: ["state:in-memory", "provider:local", "world:filesystem"],
  };
}
