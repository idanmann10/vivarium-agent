import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, isAbsolute, join } from "node:path";

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

interface V1EvidenceReferenceContext {
  readonly agentRoot: string;
  readonly worldRoot: string;
  readonly manifestDir: string;
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
const v1EvidencePathEnv = "VIVARIUM_V1_EVIDENCE_PATH";
type EnvValueStatus = "missing" | "placeholder" | "configured";

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

function isPlaceholderValue(value: string): boolean {
  return /^<[^>]+>$/.test(value.trim());
}

function envValueStatus(env: Readonly<Record<string, string | undefined>>, envName: string): EnvValueStatus {
  const value = env[envName]?.trim();
  if (value === undefined || value.length === 0) {
    return "missing";
  }

  return isPlaceholderValue(value) ? "placeholder" : "configured";
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
  if (
    owner === undefined ||
    owner.length === 0 ||
    isPlaceholderValue(owner) ||
    repo === undefined ||
    repo.length === 0 ||
    repo === placeholder ||
    isPlaceholderValue(repo)
  ) {
    return `${label}.remote:configured`;
  }

  return result.stdout.includes(`${owner}/${repo}`) ? `${label}.remote:configured` : `${label}.remote:mismatch`;
}

function providerEnvCheck(env: Readonly<Record<string, string | undefined>>): string {
  const statuses = Object.entries(env).flatMap(([key, value]) =>
    providerEnvPrefixes.some((prefix) => key.startsWith(prefix)) && value !== undefined && value.trim().length > 0
      ? [isPlaceholderValue(value) ? "placeholder" : "configured"]
      : [],
  );

  if (statuses.includes("configured")) {
    return "provider.env:configured";
  }

  return statuses.includes("placeholder") ? "provider.env:placeholder" : "provider.env:missing";
}

function githubEnvCheck(env: Readonly<Record<string, string | undefined>>): string {
  const statuses = githubEnvNames.map((name) => envValueStatus(env, name));
  if (statuses.includes("configured")) {
    return "github.env:configured";
  }

  return statuses.includes("placeholder") ? "github.env:placeholder" : "github.env:missing";
}

function repoNameCheck(env: Readonly<Record<string, string | undefined>>, envName: string, placeholder: string, label: string): string {
  const value = env[envName]?.trim();
  if (value === undefined || value.length === 0) {
    return `${label}.name:missing`;
  }

  return value === placeholder || isPlaceholderValue(value) ? `${label}.name:placeholder` : `${label}.name:configured`;
}

function requiredEnvCheck(env: Readonly<Record<string, string | undefined>>, envName: string, label: string): string {
  return `${label}:${envValueStatus(env, envName)}`;
}

function requiredFileCheck(env: Readonly<Record<string, string | undefined>>, envName: string, label: string): string {
  const value = env[envName]?.trim();
  if (value === undefined || value.length === 0) {
    return `${label}:missing`;
  }
  if (isPlaceholderValue(value)) {
    return `${label}:placeholder`;
  }

  return existsSync(value) ? `${label}:configured` : `${label}:unavailable`;
}

function asRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Readonly<Record<string, unknown>>) : undefined;
}

function textValue(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const text = value.trim();
  return text.length > 0 && !isPlaceholderValue(text) ? text : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function textArray(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.flatMap((item) => {
        const text = textValue(item);
        return text === undefined ? [] : [text];
      })
    : [];
}

function isUrlReference(value: string): boolean {
  return /^https?:\/\//.test(value);
}

function isPathLikeReference(value: string): boolean {
  return isAbsolute(value) || value.startsWith(".") || value.includes("/") || value.includes("\\") || extname(value).length > 0;
}

function evidenceReference(value: unknown, context: V1EvidenceReferenceContext): boolean {
  const text = textValue(value);
  if (text === undefined) {
    return false;
  }
  if (isUrlReference(text)) {
    return true;
  }
  if (!isPathLikeReference(text)) {
    return false;
  }

  const candidates = isAbsolute(text) ? [text] : [join(context.manifestDir, text), join(context.agentRoot, text), join(context.worldRoot, text)];
  return candidates.some((candidate) => existsSync(candidate));
}

function evidenceReferenceArray(value: unknown, context: V1EvidenceReferenceContext): readonly string[] {
  return textArray(value).filter((item) => evidenceReference(item, context));
}

function dateMillis(value: unknown): number | undefined {
  const text = textValue(value);
  if (text === undefined) {
    return undefined;
  }

  const millis = Date.parse(text);
  return Number.isNaN(millis) ? undefined : millis;
}

function v1Check(label: string, configured: boolean): string {
  return `v1.${label}:${configured ? "configured" : "missing"}`;
}

function v1EvidenceDetailChecks(manifest: Readonly<Record<string, unknown>>, context: V1EvidenceReferenceContext): readonly string[] {
  const starterPack = asRecord(manifest.starterPack);
  const skillCount = numberValue(starterPack?.skillCount);
  const traceCount = numberValue(starterPack?.traceCount);
  const realGoals: ReadonlyArray<Readonly<Record<string, unknown>>> = Array.isArray(manifest.realGoals)
    ? manifest.realGoals.flatMap((goal) => {
        const record = asRecord(goal);
        return record === undefined ? [] : [record];
      })
    : [];
  const realGoalDates = realGoals.flatMap((goal) => {
    const millis = dateMillis(goal.date);
    return millis === undefined ? [] : [millis];
  });
  const firstGoal = realGoalDates.length === 0 ? undefined : Math.min(...realGoalDates);
  const lastGoal = realGoalDates.length === 0 ? undefined : Math.max(...realGoalDates);
  const providerSmokes = asRecord(manifest.providerSmokes);
  const worldSubscriptions = asRecord(manifest.worldSubscriptions);
  const behaviorLoop = asRecord(manifest.behaviorLoop);
  const dreamArtifacts = asRecord(manifest.dreamArtifacts);
  const publicContribution = asRecord(manifest.publicContribution);
  const publishedArtifacts = asRecord(manifest.publishedArtifacts);
  const curationStats = asRecord(manifest.curationStats);
  const twoWeekImprovement = asRecord(manifest.twoWeekImprovement);
  const contributorProfileSummary = asRecord(twoWeekImprovement?.contributorProfileSummary);
  const followupMillis = dateMillis(twoWeekImprovement?.followupDate);

  return [
    v1Check(
      "starterPack",
      textValue(starterPack?.primaryDomain) === "coding" &&
        skillCount !== undefined &&
        skillCount >= 20 &&
        skillCount <= 30 &&
        traceCount !== undefined &&
        traceCount >= 3 &&
        traceCount <= 5 &&
        evidenceReference(starterPack?.curriculum, context),
    ),
    v1Check(
      "realGoals",
      realGoals.length >= 5 &&
        realGoals.every((goal) => textValue(goal.id) !== undefined && dateMillis(goal.date) !== undefined && evidenceReference(goal.evidence, context)) &&
        firstGoal !== undefined &&
        lastGoal !== undefined &&
        lastGoal - firstGoal >= 7 * 24 * 60 * 60 * 1000,
    ),
    v1Check(
      "providerSmokes",
      evidenceReference(providerSmokes?.anthropic, context) &&
        evidenceReference(providerSmokes?.openRouter, context) &&
        evidenceReference(providerSmokes?.privateOaiCompat, context),
    ),
    v1Check("internalCredentialSmoke", evidenceReference(manifest.internalCredentialSmoke, context)),
    v1Check(
      "worldSubscriptions",
      textValue(worldSubscriptions?.canonical) !== undefined && textValue(worldSubscriptions?.privateFork) !== undefined,
    ),
    v1Check(
      "behaviorLoop",
      evidenceReference(behaviorLoop?.antiPatternAvoided, context) &&
        evidenceReferenceArray(behaviorLoop?.tracesRead, context).length >= 2 &&
        evidenceReference(behaviorLoop?.recoverReplan, context) &&
        evidenceReference(behaviorLoop?.destructiveHold, context) &&
        evidenceReference(behaviorLoop?.refusal, context),
    ),
    v1Check(
      "dreamArtifacts",
      evidenceReferenceArray(dreamArtifacts?.skillCandidates, context).length >= 2 &&
        evidenceReference(dreamArtifacts?.internalSkill, context) &&
        evidenceReference(dreamArtifacts?.publicSkill, context) &&
        evidenceReference(dreamArtifacts?.antiPattern, context) &&
        evidenceReference(dreamArtifacts?.trace, context),
    ),
    v1Check(
      "publicContribution",
      evidenceReference(publicContribution?.publicSkillPr, context) &&
        evidenceReference(publicContribution?.autoMerge, context) &&
        evidenceReference(publicContribution?.canonicalSkill, context) &&
        evidenceReferenceArray(publicContribution?.positiveSignalEvidence, context).length >= 5 &&
        evidenceReferenceArray(publicContribution?.externalPullEvidence, context).length >= 3,
    ),
    v1Check(
      "publishedArtifacts",
      evidenceReference(publishedArtifacts?.antiPattern, context) &&
        evidenceReference(publishedArtifacts?.trace, context) &&
        evidenceReference(publishedArtifacts?.run, context) &&
        evidenceReference(publishedArtifacts?.secondInstallRead, context),
    ),
    v1Check(
      "curationStats",
      evidenceReference(curationStats?.featuredPick, context) &&
        evidenceReference(curationStats?.stats, context) &&
        (numberValue(curationStats?.top5SkillSharePercent) ?? 0) >= 30,
    ),
    v1Check(
      "twoWeekImprovement",
      followupMillis !== undefined &&
        lastGoal !== undefined &&
        followupMillis - lastGoal >= 14 * 24 * 60 * 60 * 1000 &&
        numberValue(twoWeekImprovement?.baselineMetric) !== undefined &&
        numberValue(twoWeekImprovement?.followupMetric) !== undefined &&
        (numberValue(twoWeekImprovement?.improvementPercent) ?? 0) > 0 &&
        evidenceReference(twoWeekImprovement?.contributorProfile, context) &&
        evidenceReference(twoWeekImprovement?.competingDiscussion, context) &&
        (numberValue(contributorProfileSummary?.publicSkills) ?? 0) >= 1 &&
        (numberValue(contributorProfileSummary?.antiPatterns) ?? 0) >= 1 &&
        (numberValue(contributorProfileSummary?.traces) ?? 0) >= 1 &&
        (numberValue(contributorProfileSummary?.publishedRuns) ?? 0) >= 1 &&
        (numberValue(contributorProfileSummary?.internalSkills) ?? 0) >= 2 &&
        (numberValue(contributorProfileSummary?.publicTrust) ?? 0) >= 0.61,
    ),
  ];
}

function v1EvidenceChecks(
  env: Readonly<Record<string, string | undefined>>,
  context: Pick<V1EvidenceReferenceContext, "agentRoot" | "worldRoot">,
): readonly string[] {
  const value = env[v1EvidencePathEnv]?.trim();
  if (value === undefined || value.length === 0) {
    return ["v1.evidencePath:missing"];
  }
  if (isPlaceholderValue(value)) {
    return ["v1.evidencePath:placeholder"];
  }
  if (!existsSync(value)) {
    return ["v1.evidencePath:unavailable"];
  }

  try {
    const manifest = asRecord(JSON.parse(readFileSync(value, "utf8")));
    if (manifest === undefined) {
      return ["v1.evidencePath:invalid"];
    }

    return ["v1.evidencePath:configured", ...v1EvidenceDetailChecks(manifest, { ...context, manifestDir: dirname(value) })];
  } catch {
    return ["v1.evidencePath:invalid"];
  }
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
  if (isPlaceholderValue(value)) {
    return `${label}:placeholder`;
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
  if (isPlaceholderValue(value)) {
    return `${label}:placeholder`;
  }

  return names === undefined || names.has(value) ? `${label}:configured` : `${label}:unavailable`;
}

function privateOaiCompatCheck(env: Readonly<Record<string, string | undefined>>): string {
  const statuses = [
    envValueStatus(env, privateOaiCompatApiKeyEnv),
    envValueStatus(env, privateOaiCompatBaseUrlEnv),
    envValueStatus(env, privateOaiCompatModelEnv),
  ];
  if (statuses.every((status) => status === "configured")) {
    return "provider.privateOaiCompat:configured";
  }

  return statuses.includes("placeholder") ? "provider.privateOaiCompat:placeholder" : "provider.privateOaiCompat:missing";
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
    case "v1.evidencePath":
      return {
        check,
        action: "Create the v1 evidence manifest and export its path before claiming live v1 verification.",
        env: [v1EvidencePathEnv],
        guide: `${guide}#v1-evidence-manifest`,
      };
    case "v1.starterPack":
      return {
        check,
        action: "Record live init evidence showing coding starter-pack skills, traces, and curriculum were installed.",
        guide: `${guide}#v1-evidence-manifest`,
      };
    case "v1.realGoals":
      return {
        check,
        action: "Record at least five real coding goals spanning a week, with evidence for each run.",
        guide: `${guide}#v1-evidence-manifest`,
      };
    case "v1.providerSmokes":
      return {
        check,
        action: "Record successful Anthropic, OpenRouter, and private OpenAI-compatible provider smoke evidence.",
        guide: `${guide}#v1-evidence-manifest`,
      };
    case "v1.internalCredentialSmoke":
      return {
        check,
        action: "Record internal API credential smoke evidence from the encrypted credential store.",
        guide: `${guide}#v1-evidence-manifest`,
      };
    case "v1.worldSubscriptions":
      return {
        check,
        action: "Record canonical and private world subscription evidence from the live registry.",
        guide: `${guide}#v1-evidence-manifest`,
      };
    case "v1.behaviorLoop":
      return {
        check,
        action: "Record live behavior-loop evidence for anti-pattern use, two traces read, Recover re-plan, destructive hold, and refusal.",
        guide: `${guide}#v1-evidence-manifest`,
      };
    case "v1.dreamArtifacts":
      return {
        check,
        action: "Record nightly Dream evidence for two skill candidates, one anti-pattern, and one trace.",
        guide: `${guide}#v1-evidence-manifest`,
      };
    case "v1.publicContribution":
      return {
        check,
        action: "Record public skill PR, K=5 positive signals, auto-merge, canonical landing, and external pull evidence.",
        guide: `${guide}#v1-evidence-manifest`,
      };
    case "v1.publishedArtifacts":
      return {
        check,
        action: "Record published anti-pattern, trace, run, and second-install read evidence.",
        guide: `${guide}#v1-evidence-manifest`,
      };
    case "v1.curationStats":
      return {
        check,
        action: "Record featured pick and STATS.md concentration evidence.",
        guide: `${guide}#v1-evidence-manifest`,
      };
    case "v1.twoWeekImprovement":
      return {
        check,
        action: "Record the two-week follow-up measurement, contributor profile, and competing Discussion evidence.",
        guide: `${guide}#v1-evidence-manifest`,
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
    providerEnvCheck(env),
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
    githubEnvCheck(env),
    requiredEnvCheck(env, githubOwnerEnv, "github.owner"),
    requiredEnvCheck(env, githubRepositoryIdEnv, "github.repositoryId"),
    requiredEnvCheck(env, githubDiscussionCategoryIdEnv, "github.discussionCategoryId"),
    githubAuthCheck(runner, env),
    ...dockerCheck(runner, env),
    ...v1EvidenceChecks(env, { agentRoot, worldRoot }),
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
