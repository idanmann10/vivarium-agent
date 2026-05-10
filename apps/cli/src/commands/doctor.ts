import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface DoctorResult {
  readonly ok: boolean;
  readonly checks: readonly string[];
  readonly nextActions?: readonly DoctorNextAction[];
}

export interface DoctorNextAction {
  readonly check: string;
  readonly action: string;
  readonly env?: readonly string[];
  readonly command?: string;
  readonly guide: string;
}

interface DoctorNextActionContext {
  readonly agentRoot: string;
  readonly worldRoot: string;
}

export interface DoctorCommandRun {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
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

function spawnEnv(env: Readonly<Record<string, string | undefined>>): Record<string, string | undefined> {
  const merged: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete merged[key];
      continue;
    }
    merged[key] = value;
  }
  return merged;
}

function defaultRunner({ command, args, cwd, env }: DoctorCommandRun): DoctorCommandRunResult {
  try {
    const result = Bun.spawnSync([command, ...args], {
      ...(cwd === undefined ? {} : { cwd }),
      ...(env === undefined ? {} : { env: spawnEnv(env) }),
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

function run(
  runner: DoctorCommandRunner,
  command: string,
  args: readonly string[],
  env?: Readonly<Record<string, string | undefined>>,
  cwd?: string,
): DoctorCommandRunResult {
  return runner({
    command,
    args,
    ...(cwd === undefined ? {} : { cwd }),
    ...(env === undefined ? {} : { env }),
  });
}

function remoteCheck(
  runner: DoctorCommandRunner,
  cwd: string,
  env: Readonly<Record<string, string | undefined>>,
  repoNameEnv: string,
  placeholder: string,
  label: string,
): string {
  const result = run(runner, "git", ["remote", "-v"], env, cwd);
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

function githubAuthCheck(runner: DoctorCommandRunner, env: Readonly<Record<string, string | undefined>>): string {
  const result = run(runner, "gh", ["auth", "status"], env);
  if (result.exitCode === 0) {
    return "github.auth:ok";
  }

  const output = `${result.stdout}\n${result.stderr}`;
  if (output.includes("invalid")) {
    return "github.auth:invalid";
  }

  return "github.auth:unavailable";
}

function dockerCheck(runner: DoctorCommandRunner, env: Readonly<Record<string, string | undefined>>): readonly string[] {
  const docker = run(runner, "docker", ["--version"], env);
  const dockerStatus = docker.exitCode === 0 ? "docker:installed" : "docker:missing";
  const dockerCompose = run(runner, "docker", ["compose", "version"], env);
  if (dockerCompose.exitCode === 0) {
    return [dockerStatus, "docker.compose:installed"];
  }

  const standaloneCompose = run(runner, "docker-compose", ["version"], env);
  return [dockerStatus, standaloneCompose.exitCode === 0 ? "docker.compose:installed" : "docker.compose:missing"];
}

function isPassingCheck(check: string): boolean {
  return check.endsWith(":configured") || check.endsWith(":ok") || check.endsWith(":installed");
}

function shellQuote(value: string): string {
  return `"${value.replace(/["\\$`]/g, "\\$&")}"`;
}

function cliCommand(context: DoctorNextActionContext, args: string): string {
  return `bun ${shellQuote(join(context.agentRoot, "apps/cli/src/index.ts"))} ${args}`;
}

function nextActionForCheck(check: string, context: DoctorNextActionContext): DoctorNextAction {
  const guide = "docs/guides/live-readiness.md";
  const [name = check] = check.split(":");

  switch (name) {
    case "agent.name":
      return {
        check,
        action: "Choose the final agent repo name and export it for live readiness.",
        env: [agentRepoNameEnv],
        guide: `${guide}#naming-gate`,
      };
    case "world.name":
      return {
        check,
        action: "Choose the final world repo name and export it for live readiness.",
        env: [worldRepoNameEnv],
        guide: `${guide}#naming-gate`,
      };
    case "agent.remote":
      return {
        check,
        action: "Add the canonical GitHub remote for the agent repo.",
        command: `git -C ${shellQuote(context.agentRoot)} remote add origin git@github.com:<owner>/<agent-repo>.git`,
        guide: `${guide}#git-remotes`,
      };
    case "world.remote":
      return {
        check,
        action: "Add the canonical GitHub remote for the world repo.",
        command: `git -C ${shellQuote(context.worldRoot)} remote add origin git@github.com:<owner>/<world-repo>.git`,
        guide: `${guide}#git-remotes`,
      };
    case "world.subscriptionsPath":
      return {
        check,
        action: "Create a world subscription registry and export its path.",
        env: [worldSubscriptionsPathEnv],
        command: cliCommand(
          context,
          'world subscribe --subscriptions-path "$VIVARIUM_WORLD_SUBSCRIPTIONS_PATH" --world-root <world-root> --world-label canonical --world-ref <world-ref>',
        ),
        guide: `${guide}#multi-world-subscriptions`,
      };
    case "world.canonicalRef":
      return {
        check,
        action: "Export the canonical world ref and ensure it exists in the subscription registry.",
        env: [canonicalWorldRefEnv],
        command: cliCommand(
          context,
          'world subscribe --subscriptions-path "$VIVARIUM_WORLD_SUBSCRIPTIONS_PATH" --world-root <canonical-world-root> --world-label canonical --world-ref "$VIVARIUM_CANONICAL_WORLD_REF"',
        ),
        guide: `${guide}#multi-world-subscriptions`,
      };
    case "world.privateForkRef":
      return {
        check,
        action: "Export the private fork world ref and ensure it exists in the subscription registry.",
        env: [privateWorldRefEnv],
        command: cliCommand(
          context,
          'world subscribe --subscriptions-path "$VIVARIUM_WORLD_SUBSCRIPTIONS_PATH" --world-root <private-world-root> --world-label private --world-ref "$VIVARIUM_PRIVATE_WORLD_REF" --auto-push',
        ),
        guide: `${guide}#multi-world-subscriptions`,
      };
    case "provider.env":
      return {
        check,
        action: "Export at least one provider API key before live provider smoke tests.",
        env: [anthropicApiKeyEnv, openRouterApiKeyEnv, privateOaiCompatApiKeyEnv],
        guide: `${guide}#provider-environment`,
      };
    case "provider.anthropic":
      return {
        check,
        action: "Export the Anthropic API key for v1 provider coverage.",
        env: [anthropicApiKeyEnv],
        guide: `${guide}#provider-environment`,
      };
    case "provider.openrouter":
      return {
        check,
        action: "Export the OpenRouter API key and save an OpenRouter provider profile.",
        env: [openRouterApiKeyEnv, openRouterProviderProfileEnv],
        command: cliCommand(
          context,
          'providers configure --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" --name "$VIVARIUM_OPENROUTER_PROVIDER_PROFILE" --kind openai-compat --api-key-env OPENROUTER_API_KEY --model <model> --base-url <provider-base-url> --capability chat --capability json_mode --context-window <context-window> --cost-class medium',
        ),
        guide: `${guide}#provider-environment`,
      };
    case "provider.privateOaiCompat":
      return {
        check,
        action: "Export the private OpenAI-compatible provider key, base URL, and model.",
        env: [privateOaiCompatApiKeyEnv, privateOaiCompatBaseUrlEnv, privateOaiCompatModelEnv],
        guide: `${guide}#provider-environment`,
      };
    case "provider.profilesPath":
      return {
        check,
        action: "Export the provider profiles path and create the configured provider profiles.",
        env: [providerProfilesPathEnv],
        command: cliCommand(
          context,
          'providers configure --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" --name <profile> --kind <provider-kind> --api-key-env <KEY_ENV> --model <model> --capability chat --context-window <context-window> --cost-class medium',
        ),
        guide: `${guide}#provider-environment`,
      };
    case "provider.anthropicProfile":
      return {
        check,
        action: "Export and create the Anthropic provider profile.",
        env: [anthropicProviderProfileEnv],
        guide: `${guide}#provider-environment`,
      };
    case "provider.openrouterProfile":
      return {
        check,
        action: "Export and create the OpenRouter provider profile.",
        env: [openRouterProviderProfileEnv],
        guide: `${guide}#provider-environment`,
      };
    case "provider.privateOaiCompatProfile":
      return {
        check,
        action: "Export and create the private OpenAI-compatible provider profile.",
        env: [privateOaiCompatProviderProfileEnv],
        guide: `${guide}#provider-environment`,
      };
    case "credentials.path":
      return {
        check,
        action: "Create the encrypted credential store and export its path.",
        env: [credentialsPathEnv],
        command: cliCommand(
          context,
          'credentials add --path "$VIVARIUM_CREDENTIALS_PATH" --master-key <local-master-key> --kind bearer --name INTERNAL_API_TOKEN --purpose "Call internal API" --value <redacted>',
        ),
        guide: `${guide}#internal-api-credential`,
      };
    case "internalApi.credentialName":
      return {
        check,
        action: "Export the encrypted credential name used for the internal API smoke test.",
        env: [internalApiCredentialNameEnv],
        guide: `${guide}#internal-api-credential`,
      };
    case "internalApi.healthUrl":
      return {
        check,
        action: "Export the internal API health URL used by credential smoke tests.",
        env: [internalApiHealthUrlEnv],
        guide: `${guide}#internal-api-credential`,
      };
    case "github.env":
      return {
        check,
        action: "Export a GitHub token for live GitHub smoke and write checks.",
        env: [...githubEnvNames],
        guide: `${guide}#github-auth`,
      };
    case "github.owner":
      return {
        check,
        action: "Export the GitHub owner or organization for the canonical world repo.",
        env: [githubOwnerEnv],
        guide: `${guide}#github-auth`,
      };
    case "github.repositoryId":
      return {
        check,
        action: "Export the GitHub GraphQL repository ID for Discussion creation.",
        env: [githubRepositoryIdEnv],
        guide: `${guide}#github-auth`,
      };
    case "github.discussionCategoryId":
      return {
        check,
        action: "Export the GitHub Discussion category ID for the Phase 0 RFC.",
        env: [githubDiscussionCategoryIdEnv],
        guide: `${guide}#github-auth`,
      };
    case "github.auth":
      return {
        check,
        action: "Refresh GitHub CLI authentication or export a valid GitHub token.",
        env: [...githubEnvNames],
        command: "gh auth status",
        guide: `${guide}#github-auth`,
      };
    case "docker":
      return {
        check,
        action: "Install Docker before daemon supervision checks.",
        command: "docker --version",
        guide: `${guide}#docker-compose`,
      };
    case "docker.compose":
      return {
        check,
        action: "Install Docker Compose before daemon supervision checks.",
        command: "docker compose version",
        guide: `${guide}#docker-compose`,
      };
    default:
      return {
        check,
        action: "Inspect this live-readiness check and clear it before claiming v1 live verification.",
        guide,
      };
  }
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
    githubAuthCheck(runner, env),
    ...dockerCheck(runner, env),
  ];

  return {
    ok: checks.every(isPassingCheck),
    checks,
    nextActions: checks
      .filter((check) => !isPassingCheck(check))
      .map((check) => nextActionForCheck(check, { agentRoot, worldRoot })),
  };
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
