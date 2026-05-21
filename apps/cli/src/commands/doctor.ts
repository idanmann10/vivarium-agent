import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, isAbsolute, join, resolve } from "node:path";
import { SQLiteStateRepository } from "../../../../packages/state/src/index.js";
import { renderVivariumGlobe } from "./branding.js";

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
  readonly detailCommand?: string;
  readonly guide: string;
  readonly completionGuide?: string;
}

export interface RenderDoctorCommandOptions {
  readonly showDetails?: boolean;
}

interface DoctorNextActionContext {
  readonly agentRoot: string;
  readonly worldRoot: string;
  readonly envFilePath?: string;
  readonly checks?: readonly string[];
}

interface V1EvidenceReferenceContext {
  readonly agentRoot: string;
  readonly worldRoot: string;
  readonly manifestDir: string;
  readonly nowMillis: number;
  readonly canonicalGitHubRepo?: {
    readonly owner: string;
    readonly repo: string;
  };
  readonly canonicalWorldRef?: string;
  readonly privateWorldRef?: string;
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
  readonly statePath?: string;
  readonly nowMillis?: number;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly envFilePath?: string;
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
const anthropicModelEnv = "VIVARIUM_ANTHROPIC_MODEL";
const anthropicContextWindowEnv = "VIVARIUM_ANTHROPIC_CONTEXT_WINDOW";
const openRouterApiKeyEnv = "OPENROUTER_API_KEY";
const openRouterModelEnv = "VIVARIUM_OPENROUTER_MODEL";
const openRouterBaseUrlEnv = "VIVARIUM_OPENROUTER_BASE_URL";
const openRouterContextWindowEnv = "VIVARIUM_OPENROUTER_CONTEXT_WINDOW";
const privateOaiCompatApiKeyEnv = "VIVARIUM_OAI_COMPAT_API_KEY";
const privateOaiCompatBaseUrlEnv = "VIVARIUM_OAI_COMPAT_BASE_URL";
const privateOaiCompatModelEnv = "VIVARIUM_OAI_COMPAT_MODEL";
const privateOaiCompatContextWindowEnv = "VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW";
const credentialsPathEnv = "VIVARIUM_CREDENTIALS_PATH";
const credentialsMasterKeyEnv = "VIVARIUM_CREDENTIALS_MASTER_KEY";
const internalApiCredentialNameEnv = "VIVARIUM_INTERNAL_API_CREDENTIAL_NAME";
const internalApiCredentialValueEnv = "VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE";
const internalApiHealthUrlEnv = "VIVARIUM_INTERNAL_API_HEALTH_URL";
const v1EvidencePathEnv = "VIVARIUM_V1_EVIDENCE_PATH";
type EnvValueStatus = "missing" | "placeholder" | "configured";

function spawnEnv(
  env: Readonly<Record<string, string | undefined>>,
): Record<string, string | undefined> {
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

function envValueStatus(
  env: Readonly<Record<string, string | undefined>>,
  envName: string,
): EnvValueStatus {
  const value = env[envName]?.trim();
  if (value === undefined || value.length === 0) {
    return "missing";
  }

  return isPlaceholderValue(value) ? "placeholder" : "configured";
}

function defaultWorldRoot(agentRoot: string): string {
  const siblingWorldRoot = resolve(dirname(agentRoot), "the-world");
  if (existsSync(siblingWorldRoot)) {
    return siblingWorldRoot;
  }

  const childWorldRoot = resolve(agentRoot, "the-world");
  return existsSync(childWorldRoot) ? childWorldRoot : agentRoot;
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

  return result.stdout.includes(`${owner}/${repo}`)
    ? `${label}.remote:configured`
    : `${label}.remote:mismatch`;
}

function providerEnvCheck(env: Readonly<Record<string, string | undefined>>): string {
  const statuses = [
    ...Object.entries(env).flatMap(([key, value]) =>
      providerEnvPrefixes.some((prefix) => key.startsWith(prefix)) &&
      value !== undefined &&
      value.trim().length > 0
        ? [isPlaceholderValue(value) ? "placeholder" : "configured"]
        : [],
    ),
    envValueStatus(env, privateOaiCompatApiKeyEnv),
  ];

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

function repoNameCheck(
  env: Readonly<Record<string, string | undefined>>,
  envName: string,
  placeholder: string,
  label: string,
): string {
  const value = env[envName]?.trim();
  if (value === undefined || value.length === 0) {
    return `${label}.name:missing`;
  }

  return value === placeholder || isPlaceholderValue(value)
    ? `${label}.name:placeholder`
    : `${label}.name:configured`;
}

function requiredEnvCheck(
  env: Readonly<Record<string, string | undefined>>,
  envName: string,
  label: string,
): string {
  return `${label}:${envValueStatus(env, envName)}`;
}

function positiveIntegerEnvCheck(
  env: Readonly<Record<string, string | undefined>>,
  envName: string,
  label: string,
): string {
  const status = envValueStatus(env, envName);
  if (status !== "configured") {
    return `${label}:${status}`;
  }

  const parsed = Number.parseInt(env[envName] ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? `${label}:configured` : `${label}:invalid`;
}

function positiveIntegerEnvValue(
  env: Readonly<Record<string, string | undefined>>,
  envName: string,
): number | undefined {
  const parsed = Number.parseInt(env[envName] ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function isHttpUrlValue(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function httpUrlEnvCheck(
  env: Readonly<Record<string, string | undefined>>,
  envName: string,
  label: string,
): string {
  const status = envValueStatus(env, envName);
  if (status !== "configured") {
    return `${label}:${status}`;
  }

  const value = env[envName]?.trim() ?? "";
  return isHttpUrlValue(value) ? `${label}:configured` : `${label}:invalid`;
}

function requiredFileCheck(
  env: Readonly<Record<string, string | undefined>>,
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

  return existsSync(value) ? `${label}:configured` : `${label}:unavailable`;
}

function liveEnvFilePermissionChecks(envFilePath: string | undefined): readonly string[] {
  if (envFilePath === undefined) {
    return [];
  }
  if (envFilePath.endsWith(".env.example")) {
    return [];
  }

  try {
    const stat = statSync(envFilePath);
    if (!stat.isFile()) {
      return ["liveEnvFile.permissions:unavailable"];
    }

    return (stat.mode & 0o077) === 0
      ? ["liveEnvFile.permissions:configured"]
      : ["liveEnvFile.permissions:insecure"];
  } catch {
    return ["liveEnvFile.permissions:unavailable"];
  }
}

function asRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : undefined;
}

function recordArray(value: unknown): ReadonlyArray<Readonly<Record<string, unknown>>> {
  return Array.isArray(value)
    ? value.flatMap((item) => {
        const record = asRecord(item);
        return record === undefined ? [] : [record];
      })
    : [];
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
  return (
    isAbsolute(value) ||
    value.startsWith(".") ||
    value.includes("/") ||
    value.includes("\\") ||
    extname(value).length > 0
  );
}

function evidenceReferenceIdentity(
  value: unknown,
  context: V1EvidenceReferenceContext,
): string | undefined {
  const text = textValue(value);
  if (text === undefined) {
    return undefined;
  }
  if (isUrlReference(text)) {
    return text;
  }
  if (!isPathLikeReference(text)) {
    return undefined;
  }

  const candidates = isAbsolute(text)
    ? [text]
    : [
        join(context.manifestDir, text),
        join(context.agentRoot, text),
        join(context.worldRoot, text),
      ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match === undefined ? undefined : resolve(match);
}

function evidenceReference(value: unknown, context: V1EvidenceReferenceContext): boolean {
  return evidenceReferenceIdentity(value, context) !== undefined;
}

function distinctEvidenceReferenceCount(
  value: unknown,
  context: V1EvidenceReferenceContext,
): number {
  return new Set(textArray(value).flatMap((item) => evidenceReferenceIdentity(item, context) ?? []))
    .size;
}

function agentEvidenceRecords(
  value: unknown,
  context: V1EvidenceReferenceContext,
): readonly { readonly agent: string; readonly evidence: string }[] {
  return recordArray(value).flatMap((record) => {
    const agent = textValue(record.agent);
    const evidence = evidenceReferenceIdentity(record.evidence, context);
    return agent === undefined || evidence === undefined ? [] : [{ agent, evidence }];
  });
}

function agentEvidenceRecord(
  value: unknown,
  context: V1EvidenceReferenceContext,
): { readonly agent: string; readonly evidence: string } | undefined {
  const record = asRecord(value);
  const agent = textValue(record?.agent);
  const evidence = evidenceReferenceIdentity(record?.evidence, context);
  return agent === undefined || evidence === undefined ? undefined : { agent, evidence };
}

function orderedEvidenceSequence(
  value: unknown,
  expectedSteps: readonly string[],
  context: V1EvidenceReferenceContext,
): boolean {
  const records = recordArray(value);
  const evidence = records.flatMap((record, index) => {
    if (textValue(record.step) !== expectedSteps[index]) {
      return [];
    }
    const reference = evidenceReferenceIdentity(record.evidence, context);
    return reference === undefined ? [] : [reference];
  });

  return (
    records.length === expectedSteps.length &&
    evidence.length === expectedSteps.length &&
    new Set(evidence).size === expectedSteps.length
  );
}

function worldSubscriptionReference(value: unknown): string | undefined {
  const text = textValue(value);
  if (text === undefined) {
    return undefined;
  }

  if (
    isUrlReference(text) ||
    /^git@[^:]+:[^/]+\/[^/]+(?:\.git)?$/.test(text) ||
    /^(?:ssh|git):\/\/.+/.test(text)
  ) {
    return text;
  }

  return undefined;
}

function githubUrlReference(value: unknown):
  | {
      readonly text: string;
      readonly owner: string;
      readonly repo: string;
      readonly parts: readonly string[];
    }
  | undefined {
  const text = textValue(value);
  if (text === undefined) {
    return undefined;
  }

  try {
    const url = new URL(text);
    if (url.protocol !== "https:" || url.hostname !== "github.com") {
      return undefined;
    }

    const parts = url.pathname.split("/").filter((part) => part.length > 0);
    const [owner, repo] = parts;
    return owner !== undefined && repo !== undefined ? { text, owner, repo, parts } : undefined;
  } catch {
    return undefined;
  }
}

function matchesCanonicalGitHubRepo(
  reference: { readonly owner: string; readonly repo: string },
  context: V1EvidenceReferenceContext,
): boolean {
  const repo = context.canonicalGitHubRepo;
  if (repo === undefined) {
    return true;
  }

  return reference.owner === repo.owner && reference.repo === repo.repo;
}

function githubDiscussionReference(
  value: unknown,
  context: V1EvidenceReferenceContext,
): string | undefined {
  const reference = githubUrlReference(value);
  if (reference === undefined || !matchesCanonicalGitHubRepo(reference, context)) {
    return undefined;
  }

  return reference.parts[2] === "discussions" &&
    /^\d+$/.test(reference.parts[3] ?? "") &&
    reference.parts.length === 4
    ? reference.text
    : undefined;
}

function githubPullRequestReference(
  value: unknown,
  context: V1EvidenceReferenceContext,
): string | undefined {
  const reference = githubUrlReference(value);
  if (reference === undefined || !matchesCanonicalGitHubRepo(reference, context)) {
    return undefined;
  }

  return reference.parts[2] === "pull" &&
    /^\d+$/.test(reference.parts[3] ?? "") &&
    reference.parts.length === 4
    ? reference.text
    : undefined;
}

function githubActionsRunReference(
  value: unknown,
  context: V1EvidenceReferenceContext,
): string | undefined {
  const reference = githubUrlReference(value);
  if (reference === undefined || !matchesCanonicalGitHubRepo(reference, context)) {
    return undefined;
  }

  return reference.parts[2] === "actions" &&
    reference.parts[3] === "runs" &&
    /^\d+$/.test(reference.parts[4] ?? "") &&
    reference.parts.length === 5
    ? reference.text
    : undefined;
}

function githubCanonicalSkillReference(
  value: unknown,
  context: V1EvidenceReferenceContext,
): string | undefined {
  const reference = githubUrlReference(value);
  if (reference === undefined || !matchesCanonicalGitHubRepo(reference, context)) {
    return undefined;
  }

  return reference.parts[2] === "blob" &&
    reference.parts.length === 9 &&
    reference.parts[4] === "domains" &&
    reference.parts[6] === "skills" &&
    reference.parts[8] === "SKILL.md"
    ? reference.text
    : undefined;
}

function githubCanonicalSkillReferences(
  value: unknown,
  context: V1EvidenceReferenceContext,
): readonly string[] {
  return textArray(value).flatMap((item) => {
    const reference = githubCanonicalSkillReference(item, context);
    return reference === undefined ? [] : [reference];
  });
}

function githubCanonicalWorldArtifactReference(
  value: unknown,
  context: V1EvidenceReferenceContext,
  kind: "antiPattern" | "trace" | "run",
): string | undefined {
  const reference = githubUrlReference(value);
  if (
    reference === undefined ||
    !matchesCanonicalGitHubRepo(reference, context) ||
    reference.parts[2] !== "blob"
  ) {
    return undefined;
  }

  const artifactPath = reference.parts.slice(4).join("/");
  const pattern =
    kind === "antiPattern"
      ? /^domains\/[^/]+\/anti-patterns\/[^/]+\/ANTI-PATTERN\.md$/
      : kind === "trace"
        ? /^domains\/[^/]+\/traces\/[^/]+\/TRACE\.md$/
        : /^runs\/[^/]+\/RUN\.md$/;
  return pattern.test(artifactPath) ? reference.text : undefined;
}

function publishedWorldArtifactReference(
  value: unknown,
  context: V1EvidenceReferenceContext,
  kind: "antiPattern" | "trace" | "run",
): string | undefined {
  if (context.canonicalGitHubRepo === undefined) {
    return evidenceReferenceIdentity(value, context);
  }

  return githubCanonicalWorldArtifactReference(value, context, kind);
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

function canonicalGitHubRepo(
  env: Readonly<Record<string, string | undefined>>,
): V1EvidenceReferenceContext["canonicalGitHubRepo"] {
  const owner = textValue(env[githubOwnerEnv]);
  const repo = textValue(env[worldRepoNameEnv]);
  return owner !== undefined && repo !== undefined && repo !== "the-world"
    ? { owner, repo }
    : undefined;
}

function configuredWorldReference(
  env: Readonly<Record<string, string | undefined>>,
  envName: string,
): string | undefined {
  const value = textValue(env[envName]);
  return value !== undefined && !isPlaceholderValue(value) ? value : undefined;
}

function v1EvidenceDetailChecks(
  manifest: Readonly<Record<string, unknown>>,
  context: V1EvidenceReferenceContext,
): readonly string[] {
  const starterPack = asRecord(manifest.starterPack);
  const skillCount = numberValue(starterPack?.skillCount);
  const traceCount = numberValue(starterPack?.traceCount);
  const starterSkillReferenceCount = distinctEvidenceReferenceCount(
    starterPack?.skillReferences,
    context,
  );
  const starterTraceReferenceCount = distinctEvidenceReferenceCount(
    starterPack?.traceReferences,
    context,
  );
  const realGoals = recordArray(manifest.realGoals);
  const realGoalIds = new Set(realGoals.flatMap((goal) => textValue(goal.id) ?? []));
  const realGoalEvidenceCount = new Set(
    realGoals.flatMap((goal) => evidenceReferenceIdentity(goal.evidence, context) ?? []),
  ).size;
  const realGoalDates = realGoals.flatMap((goal) => {
    const millis = dateMillis(goal.date);
    return millis === undefined ? [] : [millis];
  });
  const realGoalDatesAreNotFuture =
    realGoalDates.length > 0 && realGoalDates.every((millis) => millis <= context.nowMillis);
  const firstGoal = realGoalDates.length === 0 ? undefined : Math.min(...realGoalDates);
  const lastGoal = realGoalDates.length === 0 ? undefined : Math.max(...realGoalDates);
  const providerSmokes = asRecord(manifest.providerSmokes);
  const providerSmokeEvidenceCount = new Set(
    [
      providerSmokes?.anthropic,
      providerSmokes?.openRouter,
      providerSmokes?.privateOaiCompat,
    ].flatMap((reference) => evidenceReferenceIdentity(reference, context) ?? []),
  ).size;
  const worldSubscriptions = asRecord(manifest.worldSubscriptions);
  const canonicalWorldSubscription = worldSubscriptionReference(worldSubscriptions?.canonical);
  const privateForkWorldSubscription = worldSubscriptionReference(worldSubscriptions?.privateFork);
  const canonicalWorldSubscriptionMatchesConfiguredRef =
    context.canonicalWorldRef === undefined ||
    canonicalWorldSubscription === context.canonicalWorldRef;
  const privateForkWorldSubscriptionMatchesConfiguredRef =
    context.privateWorldRef === undefined ||
    privateForkWorldSubscription === context.privateWorldRef;
  const behaviorLoop = asRecord(manifest.behaviorLoop);
  const destructiveEndpoint = asRecord(behaviorLoop?.destructiveEndpoint);
  const destructiveEndpointRun = evidenceReferenceIdentity(destructiveEndpoint?.run, context);
  const destructiveEndpointSequence = orderedEvidenceSequence(
    destructiveEndpoint?.sequence,
    ["hold", "escalation", "confirmation", "continuation"],
    context,
  );
  const dreamArtifacts = asRecord(manifest.dreamArtifacts);
  const publicContribution = asRecord(manifest.publicContribution);
  const publicContributionContributorAgent = textValue(publicContribution?.contributorAgent);
  const publicContributionPositiveSignals = agentEvidenceRecords(
    publicContribution?.positiveSignals,
    context,
  );
  const publicContributionPositiveSignalAgents = new Set(
    publicContributionPositiveSignals.map((signal) => signal.agent),
  );
  const publicContributionPositiveSignalEvidence = new Set(
    publicContributionPositiveSignals.map((signal) => signal.evidence),
  );
  const publicContributionPullUses = agentEvidenceRecords(
    publicContribution?.externalPullUses,
    context,
  );
  const publicContributionPullUseAgents = new Set(
    publicContributionPullUses.map((pullUse) => pullUse.agent),
  );
  const publicContributionPullUseEvidence = new Set(
    publicContributionPullUses.map((pullUse) => pullUse.evidence),
  );
  const dreamInternalSkillEvidence = evidenceReferenceIdentity(
    dreamArtifacts?.internalSkill,
    context,
  );
  const dreamPublicSkillEvidence = evidenceReferenceIdentity(dreamArtifacts?.publicSkill, context);
  const publishedArtifacts = asRecord(manifest.publishedArtifacts);
  const publishedArtifactsContributorAgent = textValue(publishedArtifacts?.contributorAgent);
  const publishedAntiPattern = publishedWorldArtifactReference(
    publishedArtifacts?.antiPattern,
    context,
    "antiPattern",
  );
  const publishedTrace = publishedWorldArtifactReference(
    publishedArtifacts?.trace,
    context,
    "trace",
  );
  const publishedRun = publishedWorldArtifactReference(publishedArtifacts?.run, context, "run");
  const publishedTracePlanRead = agentEvidenceRecord(publishedArtifacts?.tracePlanRead, context);
  const publishedRunPlanRead = agentEvidenceRecord(publishedArtifacts?.runPlanRead, context);
  const curationStats = asRecord(manifest.curationStats);
  const curationAgentContributor = textValue(curationStats?.agentContributor);
  const curationFeaturedContributor = textValue(curationStats?.featuredContributor);
  const twoWeekImprovement = asRecord(manifest.twoWeekImprovement);
  const contributorProfileSummary = asRecord(twoWeekImprovement?.contributorProfileSummary);
  const followupMillis = dateMillis(twoWeekImprovement?.followupDate);
  const twoWeekBaselineMetric = numberValue(twoWeekImprovement?.baselineMetric);
  const twoWeekFollowupMetric = numberValue(twoWeekImprovement?.followupMetric);
  const twoWeekImprovementPercent = numberValue(twoWeekImprovement?.improvementPercent);
  const publicCanonicalSkill = githubCanonicalSkillReference(
    publicContribution?.canonicalSkill,
    context,
  );
  const twoWeekCompetingSkillReferences = new Set(
    githubCanonicalSkillReferences(twoWeekImprovement?.competingSkillReferences, context),
  );
  const twoWeekContributorAgent = textValue(twoWeekImprovement?.contributorAgent);
  const twoWeekRefinements = agentEvidenceRecords(twoWeekImprovement?.refinementEvidence, context);
  const twoWeekRefinementAgents = new Set(twoWeekRefinements.map((refinement) => refinement.agent));
  const twoWeekRefinementEvidence = new Set(
    twoWeekRefinements.map((refinement) => refinement.evidence),
  );
  const loopContributorAgent = publicContributionContributorAgent;
  const publishedArtifactsUsesLoopContributor =
    loopContributorAgent !== undefined &&
    publishedArtifactsContributorAgent === loopContributorAgent;
  const curationUsesLoopContributor =
    loopContributorAgent !== undefined && curationAgentContributor === loopContributorAgent;
  const twoWeekUsesLoopContributor =
    loopContributorAgent !== undefined && twoWeekContributorAgent === loopContributorAgent;

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
        starterSkillReferenceCount === skillCount &&
        starterTraceReferenceCount === traceCount &&
        evidenceReference(starterPack?.curriculum, context) &&
        distinctEvidenceReferenceCount(starterPack?.firstRunReferences, context) >= 2,
    ),
    v1Check(
      "realGoals",
      realGoals.length >= 5 &&
        realGoalIds.size >= 5 &&
        realGoalEvidenceCount >= 5 &&
        realGoals.every(
          (goal) =>
            textValue(goal.id) !== undefined &&
            textValue(goal.goal) !== undefined &&
            textValue(goal.domain) === "coding" &&
            dateMillis(goal.date) !== undefined &&
            evidenceReference(goal.evidence, context),
        ) &&
        realGoalDatesAreNotFuture &&
        firstGoal !== undefined &&
        lastGoal !== undefined &&
        lastGoal - firstGoal >= 7 * 24 * 60 * 60 * 1000,
    ),
    v1Check("providerSmokes", providerSmokeEvidenceCount === 3),
    v1Check(
      "internalCredentialSmoke",
      evidenceReference(manifest.internalCredentialSmoke, context),
    ),
    v1Check(
      "worldSubscriptions",
      canonicalWorldSubscription !== undefined &&
        privateForkWorldSubscription !== undefined &&
        canonicalWorldSubscription !== privateForkWorldSubscription &&
        canonicalWorldSubscriptionMatchesConfiguredRef &&
        privateForkWorldSubscriptionMatchesConfiguredRef,
    ),
    v1Check(
      "behaviorLoop",
      evidenceReference(behaviorLoop?.antiPatternAvoided, context) &&
        evidenceReference(behaviorLoop?.antiPatternUnfamiliarTerritory, context) &&
        distinctEvidenceReferenceCount(behaviorLoop?.tracesRead, context) >= 2 &&
        evidenceReference(behaviorLoop?.traceSimilarWorkflows, context) &&
        evidenceReference(behaviorLoop?.monitorFailurePattern, context) &&
        evidenceReference(behaviorLoop?.recoverReplan, context) &&
        evidenceReference(behaviorLoop?.destructiveHold, context) &&
        evidenceReference(behaviorLoop?.destructiveEscalation, context) &&
        evidenceReference(behaviorLoop?.destructiveConfirmation, context) &&
        evidenceReference(behaviorLoop?.destructiveContinuation, context) &&
        destructiveEndpointRun !== undefined &&
        destructiveEndpointSequence &&
        evidenceReference(behaviorLoop?.refusal, context),
    ),
    v1Check(
      "dreamArtifacts",
      distinctEvidenceReferenceCount(dreamArtifacts?.skillCandidates, context) >= 2 &&
        dreamInternalSkillEvidence !== undefined &&
        evidenceReference(dreamArtifacts?.internalSkillPrivateFork, context) &&
        evidenceReference(dreamArtifacts?.internalSkillCanonicalAbsence, context) &&
        dreamPublicSkillEvidence !== undefined &&
        dreamInternalSkillEvidence !== dreamPublicSkillEvidence &&
        evidenceReference(dreamArtifacts?.antiPattern, context) &&
        evidenceReference(dreamArtifacts?.trace, context) &&
        evidenceReference(dreamArtifacts?.traceSourceRun, context) &&
        evidenceReference(dreamArtifacts?.traceAnnotations, context),
    ),
    v1Check(
      "publicContribution",
      githubPullRequestReference(publicContribution?.publicSkillPr, context) !== undefined &&
        evidenceReference(publicContribution?.mathGate, context) &&
        githubActionsRunReference(publicContribution?.autoMerge, context) !== undefined &&
        publicCanonicalSkill !== undefined &&
        publicContributionContributorAgent !== undefined &&
        !publicContributionPositiveSignalAgents.has(publicContributionContributorAgent) &&
        !publicContributionPullUseAgents.has(publicContributionContributorAgent) &&
        (numberValue(publicContribution?.contributorTrust) ?? 0) >= 0.5 &&
        publicContributionPositiveSignalAgents.size >= 5 &&
        publicContributionPositiveSignalEvidence.size >= 5 &&
        publicContributionPullUseAgents.size >= 3 &&
        publicContributionPullUseEvidence.size >= 3,
    ),
    v1Check(
      "publishedArtifacts",
      publishedAntiPattern !== undefined &&
        publishedTrace !== undefined &&
        publishedRun !== undefined &&
        publishedTracePlanRead !== undefined &&
        publishedRunPlanRead !== undefined &&
        publishedArtifactsUsesLoopContributor &&
        publishedTracePlanRead.agent !== publishedArtifactsContributorAgent &&
        publishedRunPlanRead.agent !== publishedArtifactsContributorAgent &&
        publishedTracePlanRead.evidence !== publishedRunPlanRead.evidence,
    ),
    v1Check(
      "curationStats",
      evidenceReference(curationStats?.featuredPick, context) &&
        evidenceReference(curationStats?.featuredAntiPattern, context) &&
        curationUsesLoopContributor &&
        curationFeaturedContributor !== undefined &&
        curationAgentContributor !== curationFeaturedContributor &&
        evidenceReference(curationStats?.stats, context) &&
        (numberValue(curationStats?.top5SkillSharePercent) ?? 0) >= 30,
    ),
    v1Check(
      "twoWeekImprovement",
      followupMillis !== undefined &&
        followupMillis <= context.nowMillis &&
        lastGoal !== undefined &&
        followupMillis - lastGoal >= 14 * 24 * 60 * 60 * 1000 &&
        twoWeekBaselineMetric !== undefined &&
        twoWeekFollowupMetric !== undefined &&
        twoWeekFollowupMetric < twoWeekBaselineMetric &&
        (twoWeekImprovementPercent ?? 0) > 0 &&
        evidenceReference(twoWeekImprovement?.contributorProfile, context) &&
        githubDiscussionReference(twoWeekImprovement?.competingDiscussion, context) !== undefined &&
        publicCanonicalSkill !== undefined &&
        twoWeekCompetingSkillReferences.has(publicCanonicalSkill) &&
        twoWeekCompetingSkillReferences.size >= 2 &&
        evidenceReference(twoWeekImprovement?.similarGoalsEvidence, context) &&
        twoWeekUsesLoopContributor &&
        !twoWeekRefinementAgents.has(twoWeekContributorAgent) &&
        twoWeekRefinementAgents.size >= 2 &&
        twoWeekRefinementEvidence.size >= 2 &&
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
  context: Pick<V1EvidenceReferenceContext, "agentRoot" | "worldRoot" | "nowMillis">,
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

    const repo = canonicalGitHubRepo(env);
    const canonicalWorldRef = configuredWorldReference(env, canonicalWorldRefEnv);
    const privateWorldRef = configuredWorldReference(env, privateWorldRefEnv);
    const referenceContext: V1EvidenceReferenceContext = {
      ...context,
      manifestDir: dirname(value),
      ...(repo === undefined ? {} : { canonicalGitHubRepo: repo }),
      ...(canonicalWorldRef === undefined ? {} : { canonicalWorldRef }),
      ...(privateWorldRef === undefined ? {} : { privateWorldRef }),
    };
    return ["v1.evidencePath:configured", ...v1EvidenceDetailChecks(manifest, referenceContext)];
  } catch {
    return ["v1.evidencePath:invalid"];
  }
}

function worldSubscriptionRefs(
  env: Readonly<Record<string, string | undefined>>,
): ReadonlySet<string> | undefined {
  const subscriptionsPath = env[worldSubscriptionsPathEnv]?.trim();
  if (
    subscriptionsPath === undefined ||
    subscriptionsPath.length === 0 ||
    !existsSync(subscriptionsPath)
  ) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(readFileSync(subscriptionsPath, "utf8")) as {
      readonly worlds?: readonly { readonly ref?: unknown }[];
    };
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

interface ExpectedProviderProfile {
  readonly kind: string;
  readonly apiKeyEnv: string;
  readonly model: string;
  readonly baseUrl?: string;
  readonly capabilities: readonly string[];
  readonly contextWindow: number;
  readonly costClass: string;
}

function providerProfilesByName(
  env: Readonly<Record<string, string | undefined>>,
): ReadonlyMap<string, Readonly<Record<string, unknown>>> | undefined {
  const profilesPath = env[providerProfilesPathEnv]?.trim();
  if (profilesPath === undefined || profilesPath.length === 0 || !existsSync(profilesPath)) {
    return undefined;
  }

  try {
    const parsed = asRecord(JSON.parse(readFileSync(profilesPath, "utf8")));
    return new Map(
      recordArray(parsed?.profiles).flatMap((profile) => {
        const name = textValue(profile.name);
        return name === undefined ? [] : [[name, profile]];
      }),
    );
  } catch {
    return new Map();
  }
}

function providerProfileCheck(
  env: Readonly<Record<string, string | undefined>>,
  profiles: ReadonlyMap<string, Readonly<Record<string, unknown>>> | undefined,
  envName: string,
  label: string,
  expected?: ExpectedProviderProfile,
): string {
  const value = env[envName]?.trim();
  if (value === undefined || value.length === 0) {
    return `${label}:missing`;
  }
  if (isPlaceholderValue(value)) {
    return `${label}:placeholder`;
  }

  if (profiles === undefined) {
    return `${label}:configured`;
  }

  const profile = profiles.get(value);
  if (profile === undefined) {
    return `${label}:unavailable`;
  }

  return expected === undefined || providerProfileMatches(profile, expected)
    ? `${label}:configured`
    : `${label}:mismatch`;
}

function providerProfileMatches(
  profile: Readonly<Record<string, unknown>>,
  expected: ExpectedProviderProfile,
): boolean {
  return (
    textValue(profile.kind) === expected.kind &&
    textValue(profile.apiKeyEnv) === expected.apiKeyEnv &&
    textValue(profile.model) === expected.model &&
    numberValue(profile.contextWindow) === expected.contextWindow &&
    textValue(profile.baseUrl) === expected.baseUrl &&
    textValue(profile.costClass) === expected.costClass &&
    textArray(profile.capabilities).join("\n") === expected.capabilities.join("\n")
  );
}

function expectedAnthropicProviderProfile(
  env: Readonly<Record<string, string | undefined>>,
): ExpectedProviderProfile | undefined {
  const model = textValue(env[anthropicModelEnv]);
  const contextWindow = positiveIntegerEnvValue(env, anthropicContextWindowEnv);
  return model === undefined || contextWindow === undefined
    ? undefined
    : {
        kind: "anthropic",
        apiKeyEnv: anthropicApiKeyEnv,
        model,
        capabilities: ["chat", "tools"],
        contextWindow,
        costClass: "expensive",
      };
}

function expectedOpenRouterProviderProfile(
  env: Readonly<Record<string, string | undefined>>,
): ExpectedProviderProfile | undefined {
  const model = textValue(env[openRouterModelEnv]);
  const baseUrl = textValue(env[openRouterBaseUrlEnv]);
  const contextWindow = positiveIntegerEnvValue(env, openRouterContextWindowEnv);
  return model === undefined ||
    baseUrl === undefined ||
    !isHttpUrlValue(baseUrl) ||
    contextWindow === undefined
    ? undefined
    : {
        kind: "openai-compat",
        apiKeyEnv: openRouterApiKeyEnv,
        model,
        baseUrl,
        capabilities: ["chat", "json_mode"],
        contextWindow,
        costClass: "medium",
      };
}

function expectedPrivateOaiCompatProviderProfile(
  env: Readonly<Record<string, string | undefined>>,
): ExpectedProviderProfile | undefined {
  const model = textValue(env[privateOaiCompatModelEnv]);
  const baseUrl = textValue(env[privateOaiCompatBaseUrlEnv]);
  const contextWindow = positiveIntegerEnvValue(env, privateOaiCompatContextWindowEnv);
  return model === undefined ||
    baseUrl === undefined ||
    !isHttpUrlValue(baseUrl) ||
    contextWindow === undefined
    ? undefined
    : {
        kind: "openai-compat",
        apiKeyEnv: privateOaiCompatApiKeyEnv,
        model,
        baseUrl,
        capabilities: ["chat", "json_mode"],
        contextWindow,
        costClass: "medium",
      };
}

function cliResultRecord(
  result: DoctorCommandRunResult,
): Readonly<Record<string, unknown>> | undefined {
  if (result.exitCode !== 0) {
    return undefined;
  }

  try {
    const parsed = asRecord(JSON.parse(result.stdout));
    return asRecord(parsed?.result);
  } catch {
    return undefined;
  }
}

function providerSmokeCheck(
  runner: DoctorCommandRunner,
  env: Readonly<Record<string, string | undefined>>,
  agentRoot: string,
  label: string,
  profileEnv: string,
  requiredEnvNames: readonly string[],
  requiredSetupChecks: readonly string[] = [],
): string {
  const profilesPath = textValue(env[providerProfilesPathEnv]);
  const profile = textValue(env[profileEnv]);
  if (
    profilesPath === undefined ||
    !existsSync(profilesPath) ||
    profile === undefined ||
    requiredEnvNames.some((envName) => textValue(env[envName]) === undefined) ||
    requiredSetupChecks.some((check) => !isPassingCheck(check))
  ) {
    return `provider.${label}Smoke:missing`;
  }

  const result = run(
    runner,
    "bun",
    [
      "apps/cli/src/main.ts",
      "providers",
      "smoke",
      "--profiles-path",
      profilesPath,
      "--profile",
      profile,
      "--prompt",
      "Return vivarium live-readiness provider smoke ok.",
    ],
    env,
    agentRoot,
  );
  const record = cliResultRecord(result);
  if (record === undefined) {
    return `provider.${label}Smoke:unavailable`;
  }

  return record.ok === true ? `provider.${label}Smoke:ok` : `provider.${label}Smoke:failed`;
}

function privateOaiCompatCheck(env: Readonly<Record<string, string | undefined>>): string {
  const baseUrlStatus = envValueStatus(env, privateOaiCompatBaseUrlEnv);
  const statuses = [
    envValueStatus(env, privateOaiCompatApiKeyEnv),
    baseUrlStatus,
    envValueStatus(env, privateOaiCompatModelEnv),
  ];
  if (
    baseUrlStatus === "configured" &&
    !isHttpUrlValue(env[privateOaiCompatBaseUrlEnv]?.trim() ?? "")
  ) {
    return "provider.privateOaiCompat:invalid";
  }
  if (statuses.every((status) => status === "configured")) {
    return "provider.privateOaiCompat:configured";
  }

  return statuses.includes("placeholder")
    ? "provider.privateOaiCompat:placeholder"
    : "provider.privateOaiCompat:missing";
}

function internalApiCredentialValueCheck(
  env: Readonly<Record<string, string | undefined>>,
): string {
  const status = envValueStatus(env, internalApiCredentialValueEnv);
  if (status === "configured") {
    return "internalApi.credentialValue:configured";
  }

  if (storedCredentialSmokeInputsReady(env)) {
    return "internalApi.credentialValue:configured";
  }

  return `internalApi.credentialValue:${status}`;
}

function storedCredentialSmokeInputsReady(
  env: Readonly<Record<string, string | undefined>>,
): boolean {
  const credentialsPath = textValue(env[credentialsPathEnv]);
  if (credentialsPath === undefined || !existsSync(credentialsPath)) {
    return false;
  }

  return (
    textValue(env[credentialsMasterKeyEnv]) !== undefined &&
    textValue(env[internalApiCredentialNameEnv]) !== undefined &&
    isHttpUrlValue(textValue(env[internalApiHealthUrlEnv]) ?? "")
  );
}

function credentialSmokeCheck(
  runner: DoctorCommandRunner,
  env: Readonly<Record<string, string | undefined>>,
  agentRoot: string,
  requiredSetupChecks: readonly string[] = [],
): string {
  const credentialsPath = textValue(env[credentialsPathEnv]);
  const masterKey = textValue(env[credentialsMasterKeyEnv]);
  const name = textValue(env[internalApiCredentialNameEnv]);
  const url = textValue(env[internalApiHealthUrlEnv]);
  if (
    credentialsPath === undefined ||
    !existsSync(credentialsPath) ||
    masterKey === undefined ||
    name === undefined ||
    url === undefined ||
    requiredSetupChecks.some((check) => !isPassingCheck(check))
  ) {
    return "credentials.smoke:missing";
  }

  const result = run(
    runner,
    "bun",
    [
      "apps/cli/src/main.ts",
      "credentials",
      "smoke",
      "--path",
      credentialsPath,
      "--master-key",
      masterKey,
      "--name",
      name,
      "--url",
      url,
      "--method",
      "GET",
    ],
    env,
    agentRoot,
  );
  const record = cliResultRecord(result);
  if (record === undefined) {
    return "credentials.smoke:unavailable";
  }

  const status = numberValue(record.status);
  return record.ok === true && status !== undefined && status >= 200 && status < 300
    ? "credentials.smoke:ok"
    : "credentials.smoke:failed";
}

function githubAuthCheck(
  runner: DoctorCommandRunner,
  env: Readonly<Record<string, string | undefined>>,
): string {
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

function githubRepoTarget(
  env: Readonly<Record<string, string | undefined>>,
  repoNameEnv: string,
  placeholder: string,
): { readonly owner: string; readonly repo: string } | undefined {
  const owner = textValue(env[githubOwnerEnv]);
  const repo = textValue(env[repoNameEnv]);
  return owner === undefined || repo === undefined || repo === placeholder
    ? undefined
    : { owner, repo };
}

function githubCiCheck(
  runner: DoctorCommandRunner,
  env: Readonly<Record<string, string | undefined>>,
  repoNameEnv: string,
  placeholder: string,
  label: string,
): string {
  const target = githubRepoTarget(env, repoNameEnv, placeholder);
  if (target === undefined) {
    return `github.${label}:missing`;
  }

  const result = run(
    runner,
    "gh",
    [
      "run",
      "list",
      "--repo",
      `${target.owner}/${target.repo}`,
      "--branch",
      "main",
      "--workflow",
      "CI",
      "--limit",
      "1",
      "--json",
      "status,conclusion",
    ],
    env,
  );
  if (result.exitCode !== 0) {
    return `github.${label}:unavailable`;
  }

  try {
    const runs = JSON.parse(result.stdout) as unknown;
    if (!Array.isArray(runs)) {
      return `github.${label}:unavailable`;
    }

    const latest = asRecord(runs[0]);
    if (latest === undefined) {
      return `github.${label}:missing`;
    }

    const status = textValue(latest.status);
    const conclusion = textValue(latest.conclusion);
    if (status !== "completed") {
      return `github.${label}:pending`;
    }

    return conclusion === "success" ? `github.${label}:ok` : `github.${label}:failed`;
  } catch {
    return `github.${label}:unavailable`;
  }
}

function githubDiscussionCheck(
  runner: DoctorCommandRunner,
  env: Readonly<Record<string, string | undefined>>,
): string {
  const target = githubRepoTarget(env, worldRepoNameEnv, "the-world");
  if (target === undefined) {
    return "github.discussion:missing";
  }

  const result = run(
    runner,
    "gh",
    [
      "api",
      "graphql",
      "-f",
      "query=query($owner:String!,$name:String!){repository(owner:$owner,name:$name){discussions(first:20,orderBy:{field:CREATED_AT,direction:DESC}){nodes{title url}}}}",
      "-F",
      `owner=${target.owner}`,
      "-F",
      `name=${target.repo}`,
    ],
    env,
  );
  if (result.exitCode !== 0) {
    return "github.discussion:unavailable";
  }

  try {
    const parsed = asRecord(JSON.parse(result.stdout));
    const data = asRecord(parsed?.data);
    const repository = asRecord(data?.repository);
    const discussions = asRecord(repository?.discussions);
    const nodes = Array.isArray(discussions?.nodes) ? discussions.nodes : undefined;
    if (nodes === undefined) {
      return "github.discussion:unavailable";
    }

    return nodes.some((node) => textValue(asRecord(node)?.title) === "RFC 0001: Phase 0 Bootstrap")
      ? "github.discussion:configured"
      : "github.discussion:missing";
  } catch {
    return "github.discussion:unavailable";
  }
}

function dockerCheck(
  runner: DoctorCommandRunner,
  env: Readonly<Record<string, string | undefined>>,
): readonly string[] {
  const docker = run(runner, "docker", ["--version"], env);
  const dockerStatus = docker.exitCode === 0 ? "docker:installed" : "docker:missing";
  const dockerCompose = run(runner, "docker", ["compose", "version"], env);
  if (dockerCompose.exitCode === 0) {
    return [dockerStatus, "docker.compose:installed"];
  }

  const standaloneCompose = run(runner, "docker-compose", ["version"], env);
  return [
    dockerStatus,
    standaloneCompose.exitCode === 0 ? "docker.compose:installed" : "docker.compose:missing",
  ];
}

function isPassingCheck(check: string): boolean {
  return (
    check.endsWith(":configured") ||
    check.endsWith(":ok") ||
    check.endsWith(":installed") ||
    check.endsWith(":in-memory") ||
    check.endsWith(":local") ||
    check.endsWith(":filesystem")
  );
}

function isDetailedCommand(command: string): boolean {
  return command.includes("$") || command.includes("VIVARIUM_") || command.includes("<filled-env-file>");
}

function actionHasHiddenDetails(action: DoctorNextAction): boolean {
  return (
    action.env !== undefined ||
    action.detailCommand !== undefined ||
    (action.command !== undefined && isDetailedCommand(action.command))
  );
}

const friendlyDoctorCheckNames: Readonly<Record<string, string>> = {
  state: "Local state",
  "agent.name": "Agent repository name",
  "world.name": "World repository name",
  "liveEnvFile.permissions": "Setup file permissions",
  "agent.remote": "Agent GitHub remote",
  "world.remote": "World GitHub remote",
  "world.subscriptionsPath": "World subscription registry",
  "world.canonicalRef": "Canonical world subscription",
  "world.privateForkRef": "Private world subscription",
  "provider.env": "Model provider connection",
  "provider.anthropic": "Anthropic connection",
  "provider.anthropicModel": "Anthropic model",
  "provider.anthropicContextWindow": "Anthropic context window",
  "provider.openrouter": "OpenRouter connection",
  "provider.openrouterModel": "OpenRouter model",
  "provider.openrouterBaseUrl": "OpenRouter base URL",
  "provider.openrouterContextWindow": "OpenRouter context window",
  "provider.privateOaiCompat": "Private model endpoint",
  "provider.privateOaiCompatContextWindow": "Private model context window",
  "provider.profilesPath": "Provider profile store",
  "provider.anthropicProfile": "Anthropic provider profile",
  "provider.openrouterProfile": "OpenRouter provider profile",
  "provider.privateOaiCompatProfile": "Private model provider profile",
  "provider.anthropicSmoke": "Anthropic smoke test",
  "provider.openrouterSmoke": "OpenRouter smoke test",
  "provider.privateOaiCompatSmoke": "Private model smoke test",
  "credentials.path": "Encrypted credential store",
  "credentials.masterKey": "Credential store master key",
  "internalApi.credentialName": "Internal API credential name",
  "internalApi.credentialValue": "Internal API credential value",
  "internalApi.healthUrl": "Internal API health URL",
  "credentials.smoke": "Internal API credential smoke test",
  "github.env": "GitHub token",
  "github.owner": "GitHub owner",
  "github.repositoryId": "GitHub repository ID",
  "github.discussionCategoryId": "GitHub Discussion category",
  "github.auth": "GitHub authentication",
  "github.discussion": "Phase 0 GitHub Discussion",
  "github.agentCi": "Agent CI",
  "github.worldCi": "World CI",
  docker: "Docker",
  "docker.compose": "Docker Compose",
  "v1.evidencePath": "V1 evidence manifest",
  "v1.starterPack": "Starter pack evidence",
  "v1.realGoals": "Real coding goals",
  "v1.providerSmokes": "Provider smoke evidence",
  "v1.internalCredentialSmoke": "Internal credential smoke evidence",
  "v1.worldSubscriptions": "World subscription evidence",
  "v1.behaviorLoop": "Behavior loop evidence",
  "v1.dreamArtifacts": "Dream artifact evidence",
  "v1.publicContribution": "Public contribution evidence",
  "v1.publishedArtifacts": "Published artifact evidence",
  "v1.curationStats": "Curation stats evidence",
  "v1.twoWeekImprovement": "Two-week improvement evidence",
};

const friendlyDoctorStatuses: Readonly<Record<string, string>> = {
  configured: "configured",
  local: "local",
  filesystem: "filesystem",
  "in-memory": "in-memory",
  missing: "missing",
  placeholder: "needs real values",
  unavailable: "not created yet",
  uninitialized: "needs local setup",
  invalid: "invalid",
  failed: "failed",
  mismatch: "mismatch",
  pending: "pending",
};

const defaultLocalSetupFilesByCheckName: Readonly<Record<string, readonly string[]>> = {
  "agent.name": ["~/.vivarium/secrets/agent-repo-name.txt"],
  "world.name": ["~/.vivarium/secrets/world-repo-name.txt"],
  "world.canonicalRef": ["~/.vivarium/secrets/canonical-world-ref.txt"],
  "world.privateForkRef": ["~/.vivarium/secrets/private-world-ref.txt"],
  "provider.env": [
    "~/.vivarium/secrets/anthropic.key",
    "~/.vivarium/secrets/openrouter.key",
    "~/.vivarium/secrets/private-oai.key",
    "~/.vivarium/secrets/private-base-url.txt",
    "~/.vivarium/secrets/private-model.txt",
    "~/.vivarium/secrets/private-context-window.txt",
  ],
  "provider.anthropic": ["~/.vivarium/secrets/anthropic.key"],
  "provider.openrouter": ["~/.vivarium/secrets/openrouter.key"],
  "provider.privateOaiCompat": [
    "~/.vivarium/secrets/private-oai.key",
    "~/.vivarium/secrets/private-base-url.txt",
    "~/.vivarium/secrets/private-model.txt",
    "~/.vivarium/secrets/private-context-window.txt",
  ],
  "provider.privateOaiCompatContextWindow": [
    "~/.vivarium/secrets/private-context-window.txt",
  ],
  "credentials.masterKey": ["~/.vivarium/secrets/credential-master.key"],
  "internalApi.credentialValue": ["~/.vivarium/secrets/internal-api.token"],
  "internalApi.healthUrl": ["~/.vivarium/secrets/internal-health-url.txt"],
  "github.env": ["~/.vivarium/secrets/github-token.key"],
  "github.owner": ["~/.vivarium/secrets/github-owner.txt"],
  "github.repositoryId": ["~/.vivarium/secrets/github-repository-id.txt"],
  "github.discussionCategoryId": ["~/.vivarium/secrets/github-discussion-category-id.txt"],
  "github.auth": ["~/.vivarium/secrets/github-token.key"],
};

const doctorUnlockGroups: readonly {
  readonly name: string;
  readonly matches: (checkName: string) => boolean;
}[] = [
  {
    name: "Local runtime",
    matches: (checkName) => checkName === "state",
  },
  {
    name: "Setup file",
    matches: (checkName) => checkName.startsWith("liveEnvFile."),
  },
  {
    name: "Names and worlds",
    matches: (checkName) =>
      [
        "agent.name",
        "world.name",
        "agent.remote",
        "world.remote",
        "world.subscriptionsPath",
        "world.canonicalRef",
        "world.privateForkRef",
      ].includes(checkName),
  },
  {
    name: "Provider accounts",
    matches: (checkName) => checkName.startsWith("provider."),
  },
  {
    name: "Internal credential",
    matches: (checkName) => checkName.startsWith("credentials.") || checkName.startsWith("internalApi."),
  },
  {
    name: "GitHub/public release",
    matches: (checkName) => checkName.startsWith("github."),
  },
  {
    name: "Runtime services",
    matches: (checkName) => checkName === "docker" || checkName === "docker.compose",
  },
  {
    name: "V1 evidence",
    matches: (checkName) => checkName.startsWith("v1."),
  },
];

function fallbackDoctorCheckName(name: string): string {
  return name
    .replace(/^v1\./, "V1 ")
    .replace(/\./g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function renderDoctorCheckLabel(check: string, options: RenderDoctorCommandOptions): string {
  if (options.showDetails === true) {
    return check;
  }

  const [name = check, status] = check.split(":");
  const friendlyName = friendlyDoctorCheckNames[name] ?? fallbackDoctorCheckName(name);
  if (status === undefined) {
    return friendlyName;
  }

  return `${friendlyName}: ${friendlyDoctorStatuses[status] ?? status}`;
}

function doctorBlockerCountLabel(count: number): string {
  return count === 1 ? "1 blocker" : `${count} blockers`;
}

function doctorCheckName(check: string): string {
  return check.split(":")[0] ?? check;
}

function actionUsesDefaultLocalSetupFiles(action: DoctorNextAction): boolean {
  return (
    action.action.includes("generated local setup file") ||
    action.action.includes("generated local setup files")
  );
}

function renderDoctorLocalSetupFiles(
  action: DoctorNextAction,
  options: RenderDoctorCommandOptions,
): readonly string[] {
  if (options.showDetails === true || !actionUsesDefaultLocalSetupFiles(action)) {
    return [];
  }

  const files = defaultLocalSetupFilesByCheckName[doctorCheckName(action.check)] ?? [];
  if (files.length === 0) {
    return [];
  }

  if (files.length === 1) {
    return [`        Local file: ${files[0]}`];
  }

  return ["        Local files:", ...files.map((file) => `          ${file}`)];
}

function renderDoctorUnlockChecklist(
  blockedChecks: readonly string[],
  options: RenderDoctorCommandOptions,
): readonly string[] {
  if (options.showDetails === true || blockedChecks.length === 0) {
    return [];
  }

  const counts = new Map<string, number>();
  for (const check of blockedChecks) {
    const checkName = doctorCheckName(check);
    const group = doctorUnlockGroups.find((candidate) => candidate.matches(checkName));
    const groupName = group?.name ?? "Other checks";
    counts.set(groupName, (counts.get(groupName) ?? 0) + 1);
  }
  const title = blockedChecks.every((check) => doctorCheckName(check) === "state")
    ? "Local unlock checklist:"
    : "Live unlock checklist:";

  return [
    title,
    ...[
      ...doctorUnlockGroups.map((group) => group.name),
      ...(counts.has("Other checks") ? ["Other checks"] : []),
    ].flatMap((groupName) => {
      const count = counts.get(groupName) ?? 0;
      return count === 0 ? [] : [`  [needs] ${groupName}: ${doctorBlockerCountLabel(count)}`];
    }),
    "",
  ];
}

function renderDoctorAction(
  action: DoctorNextAction,
  options: RenderDoctorCommandOptions,
): readonly string[] {
  const command =
    options.showDetails === true
      ? (action.detailCommand ?? action.command)
      : action.command !== undefined && !isDetailedCommand(action.command)
        ? action.command
        : undefined;
  return [
    `  [fix] ${renderDoctorCheckLabel(action.check, options)}`,
    `        ${action.action}`,
    ...renderDoctorLocalSetupFiles(action, options),
    ...(options.showDetails === true && action.env !== undefined
      ? [`        Env: ${action.env.join(", ")}`]
      : []),
    ...(command === undefined ? [] : [`        Command: ${command}`]),
    `        Guide: ${action.guide}`,
    ...(action.completionGuide === undefined
      ? []
      : [`        Completion: ${action.completionGuide}`]),
  ];
}

export function renderDoctorCommandResult(
  result: DoctorResult,
  options: RenderDoctorCommandOptions = {},
): string {
  const passingChecks = result.ok ? result.checks : result.checks.filter(isPassingCheck);
  const blockedChecks = result.ok ? [] : result.checks.filter((check) => !isPassingCheck(check));
  const readyLabel = result.ok ? "ready" : "needs attention";
  const hiddenDetails =
    options.showDetails === true ? false : (result.nextActions ?? []).some(actionHasHiddenDetails);

  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Doctor",
    "---------------",
    `Readiness: ${readyLabel}`,
    `Checks: ${passingChecks.length} passing, ${blockedChecks.length} blocked`,
    "",
    ...(blockedChecks.length === 0
      ? ["Checks:", ...passingChecks.map((check) => `  [ok] ${renderDoctorCheckLabel(check, options)}`)]
      : [
          ...renderDoctorUnlockChecklist(blockedChecks, options),
          "Blocked checks:",
          ...blockedChecks.map((check) => `  [fix] ${renderDoctorCheckLabel(check, options)}`),
          ...(result.nextActions === undefined || result.nextActions.length === 0
            ? []
            : [
                "",
                "Next actions:",
                ...result.nextActions.flatMap((action) => renderDoctorAction(action, options)),
                ...(hiddenDetails
                  ? [
                      "",
                      "Details:",
                      "  Re-run with --details to show exact env keys and shell commands.",
                    ]
                  : []),
              ]),
        ]),
    "",
  ].join("\n");
}

function shellQuote(value: string): string {
  return `"${value.replace(/["\\$`]/g, "\\$&")}"`;
}

function cliCommand(_context: DoctorNextActionContext, args: string): string {
  return `vivarium ${args}`;
}

function offlineLocalStateCheck(statePath: string): string {
  if (!existsSync(statePath)) {
    return "state:unavailable";
  }

  try {
    const state = new SQLiteStateRepository(statePath);
    try {
      const identity = state.getIdentity();
      const hasIdentity = identity !== undefined && identity.name.trim().length > 0;
      const hasStarterSkill = state.listLocalSkills().some(
        (skill) =>
          skill.status === "promoted" &&
          skill.domain.trim().length > 0 &&
          skill.body.trim().length > 0,
      );
      return hasIdentity && hasStarterSkill ? "state:configured" : "state:uninitialized";
    } finally {
      state.close();
    }
  } catch {
    return "state:invalid";
  }
}

function offlineLocalDoctor(options: DoctorCommandOptions): DoctorResult {
  if (options.statePath === undefined) {
    return {
      ok: true,
      checks: ["state:in-memory", "provider:local", "world:filesystem"],
    };
  }

  const stateCheck = offlineLocalStateCheck(options.statePath);
  const checks = [stateCheck, "provider:local", "world:filesystem"];
  const ok = stateCheck === "state:configured";
  const stateAction =
    stateCheck === "state:invalid"
      ? "Move the invalid local SQLite state aside, then run vivarium local to create a fresh local memory database."
      : stateCheck === "state:uninitialized"
        ? "Run vivarium local to seed local-agent identity and starter skills, then rerun vivarium doctor."
      : "Run vivarium local to initialize local SQLite memory, then rerun vivarium doctor.";
  return {
    ok,
    checks,
    ...(ok
      ? {}
      : {
          nextActions: [
            {
              check: stateCheck,
              action: stateAction,
              command: "vivarium local",
              guide: "docs/guides/install.md",
            },
          ],
        }),
  };
}

function isDefaultLiveEnvFile(envFilePath: string | undefined): boolean {
  return (
    envFilePath === "live-readiness.local.env" ||
    envFilePath?.endsWith("/.vivarium/live/live-readiness.local.env") === true
  );
}

function liveSetupCommand(context: DoctorNextActionContext): string {
  const envFilePath = context.envFilePath ?? "<filled-env-file>";
  if (isDefaultLiveEnvFile(context.envFilePath)) {
    return cliCommand(context, "connect setup --confirm-write");
  }

  return cliCommand(context, `connect setup --env-file ${shellQuote(envFilePath)} --confirm-write`);
}

function liveConnectCommand(context: DoctorNextActionContext): string {
  if (context.envFilePath === undefined) {
    return cliCommand(context, "connect");
  }
  if (isDefaultLiveEnvFile(context.envFilePath)) {
    return cliCommand(context, "connect");
  }

  return cliCommand(context, `connect --env-file ${shellQuote(context.envFilePath)}`);
}

function liveAccountHandoffCommand(context: DoctorNextActionContext): string {
  return usesDefaultLiveSetup(context)
    ? cliCommand(context, "connect signup")
    : liveConnectWizardCommand(context);
}

function liveConnectFillCommand(context: DoctorNextActionContext): string {
  if (context.envFilePath === undefined) {
    return liveConnectCommand(context);
  }
  if (isDefaultLiveEnvFile(context.envFilePath)) {
    return cliCommand(context, "connect fill");
  }

  return cliCommand(context, `connect fill --env-file ${shellQuote(context.envFilePath)}`);
}

function liveConnectWizardCommand(context: DoctorNextActionContext): string {
  const setupFlags = "--secrets-dir ~/.vivarium/secrets --setup-dir ~/.vivarium/live";
  if (context.envFilePath === undefined) {
    return cliCommand(context, "setup live");
  }
  if (isDefaultLiveEnvFile(context.envFilePath)) {
    return cliCommand(context, "setup live");
  }

  return cliCommand(
    context,
    `connect wizard --path ${shellQuote(context.envFilePath)} ${setupFlags}`,
  );
}

function liveConnectSmokeCommand(context: DoctorNextActionContext): string {
  if (context.envFilePath === undefined) {
    return cliCommand(context, "connect");
  }
  if (isDefaultLiveEnvFile(context.envFilePath)) {
    return cliCommand(context, "connect smoke");
  }

  return cliCommand(context, `connect smoke --env-file ${shellQuote(context.envFilePath)}`);
}

function liveProofInitCommand(
  context: DoctorNextActionContext,
  options: { readonly overwrite?: boolean } = {},
): string {
  const suffix = options.overwrite === true ? " --overwrite" : "";
  if (context.envFilePath === undefined) {
    return cliCommand(context, `proof init${suffix}`);
  }
  if (isDefaultLiveEnvFile(context.envFilePath)) {
    return cliCommand(context, `proof init${suffix}`);
  }

  return cliCommand(
    context,
    `proof init --env-file ${shellQuote(context.envFilePath)}${suffix}`,
  );
}

function liveEnvFileLabel(context: DoctorNextActionContext): string {
  return context.envFilePath ?? "the live readiness env file";
}

function usesDefaultLiveSetup(context: DoctorNextActionContext): boolean {
  return context.envFilePath === undefined || isDefaultLiveEnvFile(context.envFilePath);
}

const providerSetupHandoffChecks = [
  "provider.env",
  "provider.anthropic",
  "provider.openrouter",
  "provider.privateOaiCompat",
] as const;

const providerSetupFillChecks = [
  "provider.anthropicModel",
  "provider.anthropicContextWindow",
  "provider.openrouterModel",
  "provider.openrouterBaseUrl",
  "provider.openrouterContextWindow",
  "provider.privateOaiCompatContextWindow",
] as const;

const credentialSetupHandoffChecks = [
  "credentials.masterKey",
  "internalApi.credentialValue",
  "internalApi.healthUrl",
] as const;

function hasBlockingNamedCheck(
  context: DoctorNextActionContext,
  names: readonly string[],
): boolean {
  return names.some((name) => {
    const check = context.checks?.find((candidate) => doctorCheckName(candidate) === name);
    return check !== undefined && !isPassingCheck(check);
  });
}

function hasProviderSetupPrerequisiteBlocker(context: DoctorNextActionContext): boolean {
  return hasBlockingNamedCheck(context, [
    ...providerSetupHandoffChecks,
    ...providerSetupFillChecks,
  ]);
}

function providerSetupPrerequisiteCommand(context: DoctorNextActionContext): string {
  if (hasBlockingNamedCheck(context, providerSetupHandoffChecks)) {
    return liveAccountHandoffCommand(context);
  }
  if (hasBlockingNamedCheck(context, providerSetupFillChecks)) {
    return liveConnectFillCommand(context);
  }

  return liveSetupCommand(context);
}

function providerProfilesPathAction(context: DoctorNextActionContext): string {
  if (usesDefaultLiveSetup(context) && hasProviderSetupPrerequisiteBlocker(context)) {
    return "Complete provider handoff/fill values first, then run vivarium connect setup to create the generated provider profile file.";
  }

  return usesDefaultLiveSetup(context)
    ? "Run vivarium connect setup to create the generated provider profile file."
    : `Fill the provider profiles path in ${liveEnvFileLabel(context)}, then create the configured provider profiles.`;
}

function providerProfileAction(context: DoctorNextActionContext, label: string): string {
  if (usesDefaultLiveSetup(context) && hasProviderSetupPrerequisiteBlocker(context)) {
    return `Complete provider handoff/fill values first, then run vivarium connect setup to create or refresh the ${label} provider profile.`;
  }

  return usesDefaultLiveSetup(context)
    ? `Run vivarium connect setup to create or refresh the ${label} provider profile.`
    : `Fill and create the ${label} provider profile from ${liveEnvFileLabel(context)}.`;
}

function credentialStoreAction(context: DoctorNextActionContext): string {
  if (
    usesDefaultLiveSetup(context) &&
    hasBlockingNamedCheck(context, credentialSetupHandoffChecks)
  ) {
    return "Complete internal credential handoff values first, then run vivarium connect setup to create the encrypted credential store at the generated local setup path.";
  }

  return usesDefaultLiveSetup(context)
    ? "Run vivarium connect setup to create the encrypted credential store at the generated local setup path."
    : `Create the encrypted credential store and save its path in ${liveEnvFileLabel(context)}.`;
}

function credentialStoreCommand(context: DoctorNextActionContext): string {
  return hasBlockingNamedCheck(context, credentialSetupHandoffChecks)
    ? liveAccountHandoffCommand(context)
    : liveSetupCommand(context);
}

function nextActionForCheck(check: string, context: DoctorNextActionContext): DoctorNextAction {
  const guide = "docs/guides/live-readiness.md";
  const completionGuide = `${guide}#completion-boundary`;
  const [name = check, status = ""] = check.split(":");

  switch (name) {
    case "agent.name":
      return {
        check,
        action: usesDefaultLiveSetup(context)
          ? "Paste the final agent repo name into its generated local setup file, then rerun vivarium setup live."
          : `Choose the final agent repo name in ${liveEnvFileLabel(context)} before live readiness.`,
        env: [agentRepoNameEnv],
        ...(usesDefaultLiveSetup(context) ? { command: liveConnectWizardCommand(context) } : {}),
        guide: `${guide}#naming-gate`,
      };
    case "world.name":
      return {
        check,
        action: usesDefaultLiveSetup(context)
          ? "Paste the final world repo name into its generated local setup file, then rerun vivarium setup live."
          : `Choose the final world repo name in ${liveEnvFileLabel(context)} before live readiness.`,
        env: [worldRepoNameEnv],
        ...(usesDefaultLiveSetup(context) ? { command: liveConnectWizardCommand(context) } : {}),
        guide: `${guide}#naming-gate`,
      };
    case "liveEnvFile.permissions":
      return {
        check,
        action:
          "Restrict the filled live-readiness env file to the current user before storing live secrets.",
        ...(context.envFilePath === undefined
          ? {}
          : { command: `chmod 600 ${shellQuote(context.envFilePath)}` }),
        guide,
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
        action: usesDefaultLiveSetup(context)
          ? "Run vivarium setup live to stage the default world subscription registry path."
          : `Create a world subscription registry and save its path in ${liveEnvFileLabel(context)}.`,
        env: [worldSubscriptionsPathEnv],
        command: usesDefaultLiveSetup(context)
          ? liveConnectWizardCommand(context)
          : cliCommand(
              context,
              'world subscribe --subscriptions-path "$VIVARIUM_WORLD_SUBSCRIPTIONS_PATH" --world-root <world-root> --world-label canonical --world-ref <world-ref>',
            ),
        detailCommand: cliCommand(
          context,
          'world subscribe --subscriptions-path "$VIVARIUM_WORLD_SUBSCRIPTIONS_PATH" --world-root <world-root> --world-label canonical --world-ref <world-ref>',
        ),
        guide: `${guide}#multi-world-subscriptions`,
      };
    case "world.canonicalRef":
      return {
        check,
        action: usesDefaultLiveSetup(context)
          ? "Paste the canonical world ref into its generated local setup file, then rerun vivarium setup live."
          : `Fill the canonical world ref in ${liveEnvFileLabel(context)} and ensure it exists in the subscription registry.`,
        env: [canonicalWorldRefEnv],
        command: usesDefaultLiveSetup(context)
          ? liveConnectWizardCommand(context)
          : cliCommand(
              context,
              'world subscribe --subscriptions-path "$VIVARIUM_WORLD_SUBSCRIPTIONS_PATH" --world-root <canonical-world-root> --world-label canonical --world-ref "$VIVARIUM_CANONICAL_WORLD_REF"',
            ),
        detailCommand: cliCommand(
          context,
          'world subscribe --subscriptions-path "$VIVARIUM_WORLD_SUBSCRIPTIONS_PATH" --world-root <canonical-world-root> --world-label canonical --world-ref "$VIVARIUM_CANONICAL_WORLD_REF"',
        ),
        guide: `${guide}#multi-world-subscriptions`,
      };
    case "world.privateForkRef":
      return {
        check,
        action: usesDefaultLiveSetup(context)
          ? "Paste the private world ref into its generated local setup file, then rerun vivarium setup live."
          : `Fill the private fork world ref in ${liveEnvFileLabel(context)} and ensure it exists in the subscription registry.`,
        env: [privateWorldRefEnv],
        command: usesDefaultLiveSetup(context)
          ? liveConnectWizardCommand(context)
          : cliCommand(
              context,
              'world subscribe --subscriptions-path "$VIVARIUM_WORLD_SUBSCRIPTIONS_PATH" --world-root <private-world-root> --world-label private --world-ref "$VIVARIUM_PRIVATE_WORLD_REF" --auto-push',
            ),
        detailCommand: cliCommand(
          context,
          'world subscribe --subscriptions-path "$VIVARIUM_WORLD_SUBSCRIPTIONS_PATH" --world-root <private-world-root> --world-label private --world-ref "$VIVARIUM_PRIVATE_WORLD_REF" --auto-push',
        ),
        guide: `${guide}#multi-world-subscriptions`,
      };
    case "provider.env":
      return {
        check,
        action: usesDefaultLiveSetup(context)
          ? "Open vivarium connect signup for account and key handoff, then paste provider values into generated local setup files and rerun vivarium setup live before smoke tests."
          : "Open the custom-path connect wizard, then connect at least one model provider before live smoke tests.",
        env: [anthropicApiKeyEnv, openRouterApiKeyEnv, privateOaiCompatApiKeyEnv],
        command: liveAccountHandoffCommand(context),
        guide: `${guide}#provider-environment`,
      };
    case "provider.anthropic":
      return {
        check,
        action: usesDefaultLiveSetup(context)
          ? "Open vivarium connect signup for the Anthropic key, then paste it into its generated local setup file and rerun vivarium setup live."
          : "Use the custom-path connect wizard to add an Anthropic API key, then save the Anthropic provider profile.",
        env: [anthropicApiKeyEnv],
        command: liveAccountHandoffCommand(context),
        detailCommand: cliCommand(
          context,
          'providers configure --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" --name "$VIVARIUM_ANTHROPIC_PROVIDER_PROFILE" --kind anthropic --api-key-env ANTHROPIC_API_KEY --model "$VIVARIUM_ANTHROPIC_MODEL" --capability chat --capability tools --context-window "$VIVARIUM_ANTHROPIC_CONTEXT_WINDOW" --cost-class expensive',
        ),
        guide: `${guide}#provider-environment`,
      };
    case "provider.anthropicModel":
      return {
        check,
        action: `Fill the Anthropic model in ${liveEnvFileLabel(context)}.`,
        env: [anthropicModelEnv],
        command: liveConnectFillCommand(context),
        guide: `${guide}#provider-environment`,
      };
    case "provider.anthropicContextWindow":
      return {
        check,
        action: `Fill the Anthropic context window in ${liveEnvFileLabel(context)} with a positive integer.`,
        env: [anthropicContextWindowEnv],
        command: liveConnectFillCommand(context),
        guide: `${guide}#provider-environment`,
      };
    case "provider.openrouter":
      return {
        check,
        action: usesDefaultLiveSetup(context)
          ? "Open vivarium connect signup for the OpenRouter key, then paste it into its generated local setup file and rerun vivarium setup live."
          : "Use the custom-path connect wizard to add an OpenRouter API key, then save the OpenRouter provider profile.",
        env: [
          openRouterApiKeyEnv,
          openRouterProviderProfileEnv,
          openRouterModelEnv,
          openRouterBaseUrlEnv,
          openRouterContextWindowEnv,
        ],
        command: liveAccountHandoffCommand(context),
        detailCommand: cliCommand(
          context,
          'providers configure --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" --name "$VIVARIUM_OPENROUTER_PROVIDER_PROFILE" --kind openai-compat --api-key-env OPENROUTER_API_KEY --model "$VIVARIUM_OPENROUTER_MODEL" --base-url "$VIVARIUM_OPENROUTER_BASE_URL" --capability chat --capability json_mode --context-window "$VIVARIUM_OPENROUTER_CONTEXT_WINDOW" --cost-class medium',
        ),
        guide: `${guide}#provider-environment`,
      };
    case "provider.openrouterModel":
      return {
        check,
        action: `Fill the OpenRouter model in ${liveEnvFileLabel(context)}.`,
        env: [openRouterModelEnv],
        command: liveConnectFillCommand(context),
        guide: `${guide}#provider-environment`,
      };
    case "provider.openrouterBaseUrl":
      return {
        check,
        action: `Fill the OpenRouter base URL in ${liveEnvFileLabel(context)}.`,
        env: [openRouterBaseUrlEnv],
        command: liveConnectFillCommand(context),
        guide: `${guide}#provider-environment`,
      };
    case "provider.openrouterContextWindow":
      return {
        check,
        action: `Fill the OpenRouter context window in ${liveEnvFileLabel(context)} with a positive integer.`,
        env: [openRouterContextWindowEnv],
        command: liveConnectFillCommand(context),
        guide: `${guide}#provider-environment`,
      };
    case "provider.privateOaiCompat":
      return {
        check,
        action: usesDefaultLiveSetup(context)
          ? "Open vivarium connect signup for the private endpoint handoff, then paste its API key, base URL, model, and context window into generated local setup files and rerun vivarium setup live."
          : "Use the custom-path connect wizard to connect the private OpenAI-compatible endpoint, then save its provider profile.",
        env: [
          privateOaiCompatApiKeyEnv,
          privateOaiCompatBaseUrlEnv,
          privateOaiCompatModelEnv,
          privateOaiCompatContextWindowEnv,
        ],
        command: liveAccountHandoffCommand(context),
        detailCommand: cliCommand(
          context,
          'providers configure --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" --name "$VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE" --kind openai-compat --api-key-env VIVARIUM_OAI_COMPAT_API_KEY --model "$VIVARIUM_OAI_COMPAT_MODEL" --base-url "$VIVARIUM_OAI_COMPAT_BASE_URL" --capability chat --capability json_mode --context-window "$VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW" --cost-class medium',
        ),
        guide: `${guide}#provider-environment`,
      };
    case "provider.privateOaiCompatContextWindow":
      return {
        check,
        action:
          usesDefaultLiveSetup(context)
            ? "Open vivarium connect signup for the private endpoint context window, then paste it into its generated local setup file and rerun vivarium setup live."
            : `Fill the private OpenAI-compatible context window in ${liveEnvFileLabel(context)} with a positive integer.`,
        env: [privateOaiCompatContextWindowEnv],
        command: usesDefaultLiveSetup(context) ? liveAccountHandoffCommand(context) : liveConnectFillCommand(context),
        guide: `${guide}#provider-environment`,
      };
    case "provider.profilesPath":
      return {
        check,
        action: providerProfilesPathAction(context),
        env: [providerProfilesPathEnv],
        command: providerSetupPrerequisiteCommand(context),
        guide: `${guide}#provider-environment`,
      };
    case "provider.anthropicProfile":
      return {
        check,
        action: providerProfileAction(context, "Anthropic"),
        env: [anthropicProviderProfileEnv],
        command: providerSetupPrerequisiteCommand(context),
        guide: `${guide}#provider-environment`,
      };
    case "provider.openrouterProfile":
      return {
        check,
        action: providerProfileAction(context, "OpenRouter"),
        env: [openRouterProviderProfileEnv],
        command: providerSetupPrerequisiteCommand(context),
        guide: `${guide}#provider-environment`,
      };
    case "provider.privateOaiCompatProfile":
      return {
        check,
        action: providerProfileAction(context, "private OpenAI-compatible"),
        env: [privateOaiCompatProviderProfileEnv],
        command: providerSetupPrerequisiteCommand(context),
        guide: `${guide}#provider-environment`,
      };
    case "provider.anthropicSmoke":
      return {
        check,
        action: "Run a successful Anthropic provider smoke through the saved provider profile.",
        env: [
          providerProfilesPathEnv,
          anthropicProviderProfileEnv,
          anthropicApiKeyEnv,
          anthropicModelEnv,
          anthropicContextWindowEnv,
        ],
        command: liveConnectSmokeCommand(context),
        detailCommand: cliCommand(
          context,
          'providers smoke --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" --profile "$VIVARIUM_ANTHROPIC_PROVIDER_PROFILE"',
        ),
        guide: `${guide}#provider-environment`,
      };
    case "provider.openrouterSmoke":
      return {
        check,
        action: "Run a successful OpenRouter provider smoke through the saved provider profile.",
        env: [
          providerProfilesPathEnv,
          openRouterProviderProfileEnv,
          openRouterApiKeyEnv,
          openRouterModelEnv,
          openRouterBaseUrlEnv,
          openRouterContextWindowEnv,
        ],
        command: liveConnectSmokeCommand(context),
        detailCommand: cliCommand(
          context,
          'providers smoke --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" --profile "$VIVARIUM_OPENROUTER_PROVIDER_PROFILE"',
        ),
        guide: `${guide}#provider-environment`,
      };
    case "provider.privateOaiCompatSmoke":
      return {
        check,
        action:
          "Run a successful private OpenAI-compatible provider smoke through the saved provider profile.",
        env: [
          providerProfilesPathEnv,
          privateOaiCompatProviderProfileEnv,
          privateOaiCompatApiKeyEnv,
          privateOaiCompatBaseUrlEnv,
          privateOaiCompatModelEnv,
          privateOaiCompatContextWindowEnv,
        ],
        command: liveConnectSmokeCommand(context),
        detailCommand: cliCommand(
          context,
          'providers smoke --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" --profile "$VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE"',
        ),
        guide: `${guide}#provider-environment`,
      };
    case "credentials.path":
      return {
        check,
        action: credentialStoreAction(context),
        env: [credentialsPathEnv],
        command: credentialStoreCommand(context),
        guide: `${guide}#internal-api-credential`,
      };
    case "credentials.masterKey":
      return {
        check,
        action: usesDefaultLiveSetup(context)
          ? "Open vivarium connect signup for the internal credential handoff, then paste the credential store master key into its generated local setup file and rerun vivarium setup live."
          : `Fill the local credential store master key in ${liveEnvFileLabel(context)}.`,
        env: [credentialsMasterKeyEnv],
        command: usesDefaultLiveSetup(context) ? liveAccountHandoffCommand(context) : liveConnectFillCommand(context),
        guide: `${guide}#internal-api-credential`,
      };
    case "internalApi.credentialName":
      return {
        check,
        action: usesDefaultLiveSetup(context)
          ? "Run vivarium setup live to write the default internal API credential name."
          : `Fill the encrypted credential name in ${liveEnvFileLabel(context)}.`,
        env: [internalApiCredentialNameEnv],
        command: usesDefaultLiveSetup(context) ? liveConnectWizardCommand(context) : liveConnectCommand(context),
        guide: `${guide}#internal-api-credential`,
      };
    case "internalApi.credentialValue":
      return {
        check,
        action: usesDefaultLiveSetup(context)
          ? "Open vivarium connect signup for the internal API token handoff, then paste it into its generated local setup file and rerun vivarium setup live."
          : `Fill the internal API credential value in ${liveEnvFileLabel(context)}.`,
        env: [internalApiCredentialValueEnv],
        command: usesDefaultLiveSetup(context) ? liveAccountHandoffCommand(context) : liveConnectFillCommand(context),
        guide: `${guide}#internal-api-credential`,
      };
    case "internalApi.healthUrl":
      return {
        check,
        action: usesDefaultLiveSetup(context)
          ? "Open vivarium connect signup for the internal API health URL handoff, then paste it into its generated local setup file and rerun vivarium setup live."
          : `Fill the internal API health URL in ${liveEnvFileLabel(context)}.`,
        env: [internalApiHealthUrlEnv],
        command: usesDefaultLiveSetup(context) ? liveAccountHandoffCommand(context) : liveConnectFillCommand(context),
        guide: `${guide}#internal-api-credential`,
      };
    case "credentials.smoke":
      return {
        check,
        action:
          "Run a successful internal API credential smoke through the encrypted credential store.",
        env: [
          credentialsPathEnv,
          credentialsMasterKeyEnv,
          internalApiCredentialNameEnv,
          internalApiHealthUrlEnv,
        ],
        command: liveConnectSmokeCommand(context),
        detailCommand: cliCommand(
          context,
          'credentials smoke --path "$VIVARIUM_CREDENTIALS_PATH" --master-key "$VIVARIUM_CREDENTIALS_MASTER_KEY" --name "$VIVARIUM_INTERNAL_API_CREDENTIAL_NAME" --url "$VIVARIUM_INTERNAL_API_HEALTH_URL" --method GET',
        ),
        guide: `${guide}#internal-api-credential`,
      };
    case "github.env":
      return {
        check,
        action: usesDefaultLiveSetup(context)
          ? "Open vivarium connect signup for GitHub/public release handoff, then paste the GitHub token into its generated local setup file and rerun vivarium setup live."
          : `Add a GitHub token for live smoke and write checks to ${liveEnvFileLabel(context)}.`,
        env: [...githubEnvNames],
        ...(usesDefaultLiveSetup(context) ? { command: liveAccountHandoffCommand(context) } : {}),
        guide: `${guide}#github-auth`,
      };
    case "github.owner":
      return {
        check,
        action: usesDefaultLiveSetup(context)
          ? "Open vivarium connect signup for GitHub/public release handoff, then paste the GitHub owner into its generated local setup file and rerun vivarium setup live."
          : `Fill the GitHub owner or organization for the canonical world repo in ${liveEnvFileLabel(context)}.`,
        env: [githubOwnerEnv],
        ...(usesDefaultLiveSetup(context) ? { command: liveAccountHandoffCommand(context) } : {}),
        guide: `${guide}#github-auth`,
      };
    case "github.repositoryId":
      return {
        check,
        action: usesDefaultLiveSetup(context)
          ? "Open vivarium connect signup for GitHub/public release handoff, then paste the GitHub repository ID into its generated local setup file and rerun vivarium setup live."
          : `Fill the GitHub GraphQL repository ID for Discussion creation in ${liveEnvFileLabel(context)}.`,
        env: [githubRepositoryIdEnv],
        ...(usesDefaultLiveSetup(context) ? { command: liveAccountHandoffCommand(context) } : {}),
        guide: `${guide}#github-auth`,
      };
    case "github.discussionCategoryId":
      return {
        check,
        action: usesDefaultLiveSetup(context)
          ? "Open vivarium connect signup for GitHub/public release handoff, then paste the GitHub Discussion category ID into its generated local setup file and rerun vivarium setup live."
          : `Fill the GitHub Discussion category ID for the Phase 0 RFC in ${liveEnvFileLabel(context)}.`,
        env: [githubDiscussionCategoryIdEnv],
        ...(usesDefaultLiveSetup(context) ? { command: liveAccountHandoffCommand(context) } : {}),
        guide: `${guide}#github-auth`,
      };
    case "github.auth":
      return {
        check,
        action: usesDefaultLiveSetup(context)
          ? "Refresh GitHub CLI authentication, or paste a valid GitHub token into its generated local setup file and rerun vivarium setup live."
          : `Refresh GitHub CLI authentication or add a valid GitHub token to ${liveEnvFileLabel(context)}.`,
        env: [...githubEnvNames],
        command: "gh auth status",
        guide: `${guide}#github-auth`,
      };
    case "github.discussion":
      return {
        check,
        action:
          "Open the Phase 0 RFC Discussion in the canonical world repo and verify it is visible through GitHub.",
        env: [
          githubOwnerEnv,
          worldRepoNameEnv,
          githubRepositoryIdEnv,
          githubDiscussionCategoryIdEnv,
        ],
        ...(usesDefaultLiveSetup(context)
          ? { command: cliCommand(context, "github discussion --confirm-write") }
          : {}),
        detailCommand: cliCommand(
          context,
          'github discussion --owner "$VIVARIUM_GITHUB_OWNER" --repo "$VIVARIUM_WORLD_REPO_NAME" --token-env GITHUB_TOKEN --repository-id "$VIVARIUM_GITHUB_REPOSITORY_ID" --category-id "$VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID" --title "RFC 0001: Phase 0 Bootstrap" --body "$(cat ../the-world/proposals/0001-phase-0-bootstrap-rfc.md)" --confirm-write',
        ),
        guide: `${guide}#github-auth`,
      };
    case "github.agentCi":
      return {
        check,
        action: "Make the latest agent GitHub Actions CI run on main complete successfully.",
        env: [githubOwnerEnv, agentRepoNameEnv],
        ...(usesDefaultLiveSetup(context)
          ? {
              command: cliCommand(
                context,
                "github workflow-runs --target agent --branch main --limit 1",
              ),
            }
          : {}),
        detailCommand:
          'gh run list --repo "$VIVARIUM_GITHUB_OWNER/$VIVARIUM_AGENT_REPO_NAME" --branch main --workflow CI --limit 1',
        guide: `${guide}#github-auth`,
      };
    case "github.worldCi":
      return {
        check,
        action: "Make the latest world GitHub Actions CI run on main complete successfully.",
        env: [githubOwnerEnv, worldRepoNameEnv],
        ...(usesDefaultLiveSetup(context)
          ? {
              command: cliCommand(
                context,
                "github workflow-runs --target world --branch main --limit 1",
              ),
            }
          : {}),
        detailCommand:
          'gh run list --repo "$VIVARIUM_GITHUB_OWNER/$VIVARIUM_WORLD_REPO_NAME" --branch main --workflow CI --limit 1',
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
        action:
          status === "missing" || status === "placeholder"
            ? usesDefaultLiveSetup(context)
              ? "Run vivarium setup live so it can save the v1 evidence manifest path before live verification."
              : "Run the custom-path connect wizard with the setup directory so it can save the v1 evidence manifest path before live verification."
            : usesDefaultLiveSetup(context)
              ? "Run vivarium proof init to create or repair the generated v1 evidence manifest before claiming live verification."
              : `Create or repair the configured v1 evidence manifest from ${liveEnvFileLabel(context)} before claiming live v1 verification.`,
        env: [v1EvidencePathEnv],
        command:
          status === "missing" || status === "placeholder"
            ? liveConnectWizardCommand(context)
            : liveProofInitCommand(context, { overwrite: status === "invalid" }),
        guide: `${guide}#v1-evidence-manifest`,
        completionGuide,
      };
    case "v1.starterPack":
      return {
        check,
        action:
          "Record live init evidence showing distinct installed coding starter-pack skills, distinct installed starter traces, curriculum, and distinct first-run references.",
        guide: `${guide}#v1-evidence-manifest`,
        completionGuide,
      };
    case "v1.realGoals":
      return {
        check,
        action:
          "Record at least five distinct named real coding goals spanning a week, with domain, distinct evidence for each run, and dates that are not in the future.",
        guide: `${guide}#v1-evidence-manifest`,
        completionGuide,
      };
    case "v1.providerSmokes":
      return {
        check,
        action:
          "Record distinct successful Anthropic, OpenRouter, and private OpenAI-compatible provider smoke evidence.",
        guide: `${guide}#v1-evidence-manifest`,
        completionGuide,
      };
    case "v1.internalCredentialSmoke":
      return {
        check,
        action:
          "Record internal API credential smoke evidence from the encrypted credential store.",
        guide: `${guide}#v1-evidence-manifest`,
        completionGuide,
      };
    case "v1.worldSubscriptions":
      return {
        check,
        action: "Record canonical and private world subscription evidence from the live registry.",
        guide: `${guide}#v1-evidence-manifest`,
        completionGuide,
      };
    case "v1.behaviorLoop":
      return {
        check,
        action:
          "Record live behavior-loop evidence for anti-pattern use before unfamiliar territory, two distinct traces read that demonstrate similar workflows, Monitor tool-failure detection, Recover re-plan, one ordered destructive-endpoint run sequence that holds, escalates, receives confirmation, and continues, and refusal.",
        guide: `${guide}#v1-evidence-manifest`,
        completionGuide,
      };
    case "v1.dreamArtifacts":
      return {
        check,
        action:
          "Record nightly Dream evidence for two distinct skill candidates, distinct internal and public skills, proof the internal skill was pushed to the private fork only, one anti-pattern, and one trace auto-extracted from an instructive run with annotations.",
        guide: `${guide}#v1-evidence-manifest`,
        completionGuide,
      };
    case "v1.publicContribution":
      return {
        check,
        action:
          "Record the contributor agent identity, a GitHub public skill PR URL, math gate, contributor trust, K=5 distinct other-agent positive-signal agent/evidence records, a GitHub Actions auto-merge run URL, canonical world skill landing, and three distinct other-agent pull/use evidence records.",
        guide: `${guide}#v1-evidence-manifest`,
        completionGuide,
      };
    case "v1.publishedArtifacts":
      return {
        check,
        action:
          "Record published anti-pattern, trace, and run canonical-world GitHub blob refs, the contributor agent identity as the same public contribution contributor, and separate other-agent trace and run Plan-read agent/evidence records.",
        guide: `${guide}#v1-evidence-manifest`,
        completionGuide,
      };
    case "v1.curationStats":
      return {
        check,
        action:
          "Record featured pick evidence including a different contributor's anti-pattern, the same public contribution contributor as the curation agent contributor, plus STATS.md evidence showing at least 30% top-five contributor concentration.",
        guide: `${guide}#v1-evidence-manifest`,
        completionGuide,
      };
    case "v1.twoWeekImprovement":
      return {
        check,
        action:
          "Record the two-week follow-up at least fourteen days after the last goal with a date that is not in the future, faster follow-up metrics on similar goals, contributor profile counts/trust, contributor agent identity as the same public contribution contributor, a competing GitHub Discussion URL, two distinct live competing skill variant references, similar-goal comparison evidence, and two distinct other-agent refinement agent/evidence records excluding the contributor.",
        guide: `${guide}#v1-evidence-manifest`,
        completionGuide,
      };
    default:
      return {
        check,
        action:
          "Inspect this live-readiness check and clear it before claiming v1 live verification.",
        guide,
      };
  }
}

function liveReadinessDoctor(options: DoctorCommandOptions): DoctorResult {
  const runner = options.runner ?? defaultRunner;
  const env = options.env ?? process.env;
  const agentRoot = options.agentRoot ?? process.cwd();
  const worldRoot = options.worldRoot ?? defaultWorldRoot(agentRoot);
  const nowMillis = options.nowMillis ?? Date.now();
  const worldRefs = worldSubscriptionRefs(env);
  const profiles = providerProfilesByName(env);
  const nextActionContext: DoctorNextActionContext = {
    agentRoot,
    worldRoot,
    ...(options.envFilePath === undefined ? {} : { envFilePath: options.envFilePath }),
  };
  const providerAnthropicCheck = requiredEnvCheck(env, anthropicApiKeyEnv, "provider.anthropic");
  const providerAnthropicModelCheck = requiredEnvCheck(
    env,
    anthropicModelEnv,
    "provider.anthropicModel",
  );
  const providerAnthropicContextWindowCheck = positiveIntegerEnvCheck(
    env,
    anthropicContextWindowEnv,
    "provider.anthropicContextWindow",
  );
  const providerOpenrouterCheck = requiredEnvCheck(env, openRouterApiKeyEnv, "provider.openrouter");
  const providerOpenrouterModelCheck = requiredEnvCheck(
    env,
    openRouterModelEnv,
    "provider.openrouterModel",
  );
  const providerOpenrouterBaseUrlCheck = httpUrlEnvCheck(
    env,
    openRouterBaseUrlEnv,
    "provider.openrouterBaseUrl",
  );
  const providerOpenrouterContextWindowCheck = positiveIntegerEnvCheck(
    env,
    openRouterContextWindowEnv,
    "provider.openrouterContextWindow",
  );
  const providerPrivateOaiCompatCheck = privateOaiCompatCheck(env);
  const providerPrivateOaiCompatContextWindowCheck = positiveIntegerEnvCheck(
    env,
    privateOaiCompatContextWindowEnv,
    "provider.privateOaiCompatContextWindow",
  );
  const providerProfilesPathCheck = requiredFileCheck(
    env,
    providerProfilesPathEnv,
    "provider.profilesPath",
  );
  const providerAnthropicProfileCheck = providerProfileCheck(
    env,
    profiles,
    anthropicProviderProfileEnv,
    "provider.anthropicProfile",
    expectedAnthropicProviderProfile(env),
  );
  const providerOpenrouterProfileCheck = providerProfileCheck(
    env,
    profiles,
    openRouterProviderProfileEnv,
    "provider.openrouterProfile",
    expectedOpenRouterProviderProfile(env),
  );
  const providerPrivateOaiCompatProfileCheck = providerProfileCheck(
    env,
    profiles,
    privateOaiCompatProviderProfileEnv,
    "provider.privateOaiCompatProfile",
    expectedPrivateOaiCompatProviderProfile(env),
  );
  const credentialsPathCheck = requiredFileCheck(env, credentialsPathEnv, "credentials.path");
  const credentialsMasterKeyCheck = requiredEnvCheck(
    env,
    credentialsMasterKeyEnv,
    "credentials.masterKey",
  );
  const internalApiCredentialNameCheck = requiredEnvCheck(
    env,
    internalApiCredentialNameEnv,
    "internalApi.credentialName",
  );
  const internalApiCredentialValue = internalApiCredentialValueCheck(env);
  const internalApiHealthUrlCheck = httpUrlEnvCheck(
    env,
    internalApiHealthUrlEnv,
    "internalApi.healthUrl",
  );
  const checks = [
    ...liveEnvFilePermissionChecks(options.envFilePath),
    repoNameCheck(env, agentRepoNameEnv, "the-agent", "agent"),
    repoNameCheck(env, worldRepoNameEnv, "the-world", "world"),
    remoteCheck(runner, agentRoot, env, agentRepoNameEnv, "the-agent", "agent"),
    remoteCheck(runner, worldRoot, env, worldRepoNameEnv, "the-world", "world"),
    requiredFileCheck(env, worldSubscriptionsPathEnv, "world.subscriptionsPath"),
    worldRefCheck(env, worldRefs, canonicalWorldRefEnv, "world.canonicalRef"),
    worldRefCheck(env, worldRefs, privateWorldRefEnv, "world.privateForkRef"),
    providerEnvCheck(env),
    providerAnthropicCheck,
    providerAnthropicModelCheck,
    providerAnthropicContextWindowCheck,
    providerOpenrouterCheck,
    providerOpenrouterModelCheck,
    providerOpenrouterBaseUrlCheck,
    providerOpenrouterContextWindowCheck,
    providerPrivateOaiCompatCheck,
    providerPrivateOaiCompatContextWindowCheck,
    providerProfilesPathCheck,
    providerAnthropicProfileCheck,
    providerOpenrouterProfileCheck,
    providerPrivateOaiCompatProfileCheck,
    providerSmokeCheck(
      runner,
      env,
      agentRoot,
      "anthropic",
      anthropicProviderProfileEnv,
      [anthropicApiKeyEnv, anthropicModelEnv, anthropicContextWindowEnv],
      [
        providerProfilesPathCheck,
        providerAnthropicProfileCheck,
        providerAnthropicCheck,
        providerAnthropicModelCheck,
        providerAnthropicContextWindowCheck,
      ],
    ),
    providerSmokeCheck(
      runner,
      env,
      agentRoot,
      "openrouter",
      openRouterProviderProfileEnv,
      [openRouterApiKeyEnv, openRouterModelEnv, openRouterBaseUrlEnv, openRouterContextWindowEnv],
      [
        providerProfilesPathCheck,
        providerOpenrouterProfileCheck,
        providerOpenrouterCheck,
        providerOpenrouterModelCheck,
        providerOpenrouterBaseUrlCheck,
        providerOpenrouterContextWindowCheck,
      ],
    ),
    providerSmokeCheck(
      runner,
      env,
      agentRoot,
      "privateOaiCompat",
      privateOaiCompatProviderProfileEnv,
      [
        privateOaiCompatApiKeyEnv,
        privateOaiCompatBaseUrlEnv,
        privateOaiCompatModelEnv,
        privateOaiCompatContextWindowEnv,
      ],
      [
        providerProfilesPathCheck,
        providerPrivateOaiCompatProfileCheck,
        providerPrivateOaiCompatCheck,
        providerPrivateOaiCompatContextWindowCheck,
      ],
    ),
    credentialsPathCheck,
    credentialsMasterKeyCheck,
    internalApiCredentialNameCheck,
    internalApiCredentialValue,
    internalApiHealthUrlCheck,
    credentialSmokeCheck(runner, env, agentRoot, [
      credentialsPathCheck,
      credentialsMasterKeyCheck,
      internalApiCredentialNameCheck,
      internalApiHealthUrlCheck,
    ]),
    githubEnvCheck(env),
    requiredEnvCheck(env, githubOwnerEnv, "github.owner"),
    requiredEnvCheck(env, githubRepositoryIdEnv, "github.repositoryId"),
    requiredEnvCheck(env, githubDiscussionCategoryIdEnv, "github.discussionCategoryId"),
    githubAuthCheck(runner, env),
    githubDiscussionCheck(runner, env),
    githubCiCheck(runner, env, agentRepoNameEnv, "the-agent", "agentCi"),
    githubCiCheck(runner, env, worldRepoNameEnv, "the-world", "worldCi"),
    ...dockerCheck(runner, env),
    ...v1EvidenceChecks(env, { agentRoot, worldRoot, nowMillis }),
  ];

  return {
    ok: checks.every(isPassingCheck),
    checks,
    nextActions: checks
      .filter((check) => !isPassingCheck(check))
      .map((check) => nextActionForCheck(check, { ...nextActionContext, checks })),
  };
}

export function doctorCommand(options: DoctorCommandOptions = {}): DoctorResult {
  if (options.mode === "live-readiness") {
    return liveReadinessDoctor(options);
  }

  return offlineLocalDoctor(options);
}
