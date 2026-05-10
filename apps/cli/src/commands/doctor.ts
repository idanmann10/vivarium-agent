import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, isAbsolute, join, resolve } from "node:path";

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
  readonly envFilePath?: string;
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
const openRouterApiKeyEnv = "OPENROUTER_API_KEY";
const privateOaiCompatApiKeyEnv = "VIVARIUM_OAI_COMPAT_API_KEY";
const privateOaiCompatBaseUrlEnv = "VIVARIUM_OAI_COMPAT_BASE_URL";
const privateOaiCompatModelEnv = "VIVARIUM_OAI_COMPAT_MODEL";
const credentialsPathEnv = "VIVARIUM_CREDENTIALS_PATH";
const credentialsMasterKeyEnv = "VIVARIUM_CREDENTIALS_MASTER_KEY";
const internalApiCredentialNameEnv = "VIVARIUM_INTERNAL_API_CREDENTIAL_NAME";
const internalApiCredentialValueEnv = "VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE";
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
  const statuses = [
    ...Object.entries(env).flatMap(([key, value]) =>
      providerEnvPrefixes.some((prefix) => key.startsWith(prefix)) && value !== undefined && value.trim().length > 0
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

    return (stat.mode & 0o077) === 0 ? ["liveEnvFile.permissions:configured"] : ["liveEnvFile.permissions:insecure"];
  } catch {
    return ["liveEnvFile.permissions:unavailable"];
  }
}

function asRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Readonly<Record<string, unknown>>) : undefined;
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
  return isAbsolute(value) || value.startsWith(".") || value.includes("/") || value.includes("\\") || extname(value).length > 0;
}

function evidenceReferenceIdentity(value: unknown, context: V1EvidenceReferenceContext): string | undefined {
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

  const candidates = isAbsolute(text) ? [text] : [join(context.manifestDir, text), join(context.agentRoot, text), join(context.worldRoot, text)];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match === undefined ? undefined : resolve(match);
}

function evidenceReference(value: unknown, context: V1EvidenceReferenceContext): boolean {
  return evidenceReferenceIdentity(value, context) !== undefined;
}

function evidenceReferenceArray(value: unknown, context: V1EvidenceReferenceContext): readonly string[] {
  return textArray(value).filter((item) => evidenceReference(item, context));
}

function distinctEvidenceReferenceCount(value: unknown, context: V1EvidenceReferenceContext): number {
  return new Set(textArray(value).flatMap((item) => evidenceReferenceIdentity(item, context) ?? [])).size;
}

function agentEvidenceRecords(value: unknown, context: V1EvidenceReferenceContext): readonly { readonly agent: string; readonly evidence: string }[] {
  return recordArray(value).flatMap((record) => {
    const agent = textValue(record.agent);
    const evidence = evidenceReferenceIdentity(record.evidence, context);
    return agent === undefined || evidence === undefined ? [] : [{ agent, evidence }];
  });
}

function agentEvidenceRecord(value: unknown, context: V1EvidenceReferenceContext): { readonly agent: string; readonly evidence: string } | undefined {
  const record = asRecord(value);
  const agent = textValue(record?.agent);
  const evidence = evidenceReferenceIdentity(record?.evidence, context);
  return agent === undefined || evidence === undefined ? undefined : { agent, evidence };
}

function orderedEvidenceSequence(value: unknown, expectedSteps: readonly string[], context: V1EvidenceReferenceContext): boolean {
  const records = recordArray(value);
  const evidence = records.flatMap((record, index) => {
    if (textValue(record.step) !== expectedSteps[index]) {
      return [];
    }
    const reference = evidenceReferenceIdentity(record.evidence, context);
    return reference === undefined ? [] : [reference];
  });

  return records.length === expectedSteps.length && evidence.length === expectedSteps.length && new Set(evidence).size === expectedSteps.length;
}

function worldSubscriptionReference(value: unknown): string | undefined {
  const text = textValue(value);
  if (text === undefined) {
    return undefined;
  }

  if (isUrlReference(text) || /^git@[^:]+:[^/]+\/[^/]+(?:\.git)?$/.test(text) || /^(?:ssh|git):\/\/.+/.test(text)) {
    return text;
  }

  return undefined;
}

function githubUrlReference(value: unknown): { readonly text: string; readonly owner: string; readonly repo: string; readonly parts: readonly string[] } | undefined {
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

function githubDiscussionReference(value: unknown, context: V1EvidenceReferenceContext): string | undefined {
  const reference = githubUrlReference(value);
  if (reference === undefined || !matchesCanonicalGitHubRepo(reference, context)) {
    return undefined;
  }

  return reference.parts[2] === "discussions" && /^\d+$/.test(reference.parts[3] ?? "") && reference.parts.length === 4
    ? reference.text
    : undefined;
}

function githubPullRequestReference(value: unknown, context: V1EvidenceReferenceContext): string | undefined {
  const reference = githubUrlReference(value);
  if (reference === undefined || !matchesCanonicalGitHubRepo(reference, context)) {
    return undefined;
  }

  return reference.parts[2] === "pull" && /^\d+$/.test(reference.parts[3] ?? "") && reference.parts.length === 4 ? reference.text : undefined;
}

function githubActionsRunReference(value: unknown, context: V1EvidenceReferenceContext): string | undefined {
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

function githubCanonicalSkillReference(value: unknown, context: V1EvidenceReferenceContext): string | undefined {
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

function githubCanonicalSkillReferences(value: unknown, context: V1EvidenceReferenceContext): readonly string[] {
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
  if (reference === undefined || !matchesCanonicalGitHubRepo(reference, context) || reference.parts[2] !== "blob") {
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

function canonicalGitHubRepo(env: Readonly<Record<string, string | undefined>>): V1EvidenceReferenceContext["canonicalGitHubRepo"] {
  const owner = textValue(env[githubOwnerEnv]);
  const repo = textValue(env[worldRepoNameEnv]);
  return owner !== undefined && repo !== undefined && repo !== "the-world" ? { owner, repo } : undefined;
}

function configuredWorldReference(env: Readonly<Record<string, string | undefined>>, envName: string): string | undefined {
  const value = textValue(env[envName]);
  return value !== undefined && !isPlaceholderValue(value) ? value : undefined;
}

function v1EvidenceDetailChecks(manifest: Readonly<Record<string, unknown>>, context: V1EvidenceReferenceContext): readonly string[] {
  const starterPack = asRecord(manifest.starterPack);
  const skillCount = numberValue(starterPack?.skillCount);
  const traceCount = numberValue(starterPack?.traceCount);
  const starterSkillReferenceCount = distinctEvidenceReferenceCount(starterPack?.skillReferences, context);
  const starterTraceReferenceCount = distinctEvidenceReferenceCount(starterPack?.traceReferences, context);
  const realGoals = recordArray(manifest.realGoals);
  const realGoalIds = new Set(realGoals.flatMap((goal) => textValue(goal.id) ?? []));
  const realGoalEvidenceCount = new Set(realGoals.flatMap((goal) => evidenceReferenceIdentity(goal.evidence, context) ?? [])).size;
  const realGoalDates = realGoals.flatMap((goal) => {
    const millis = dateMillis(goal.date);
    return millis === undefined ? [] : [millis];
  });
  const realGoalDatesAreNotFuture = realGoalDates.length > 0 && realGoalDates.every((millis) => millis <= context.nowMillis);
  const firstGoal = realGoalDates.length === 0 ? undefined : Math.min(...realGoalDates);
  const lastGoal = realGoalDates.length === 0 ? undefined : Math.max(...realGoalDates);
  const providerSmokes = asRecord(manifest.providerSmokes);
  const providerSmokeEvidenceCount = new Set(
    [providerSmokes?.anthropic, providerSmokes?.openRouter, providerSmokes?.privateOaiCompat].flatMap(
      (reference) => evidenceReferenceIdentity(reference, context) ?? [],
    ),
  ).size;
  const worldSubscriptions = asRecord(manifest.worldSubscriptions);
  const canonicalWorldSubscription = worldSubscriptionReference(worldSubscriptions?.canonical);
  const privateForkWorldSubscription = worldSubscriptionReference(worldSubscriptions?.privateFork);
  const canonicalWorldSubscriptionMatchesConfiguredRef =
    context.canonicalWorldRef === undefined || canonicalWorldSubscription === context.canonicalWorldRef;
  const privateForkWorldSubscriptionMatchesConfiguredRef =
    context.privateWorldRef === undefined || privateForkWorldSubscription === context.privateWorldRef;
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
  const publicContributionPositiveSignals = agentEvidenceRecords(publicContribution?.positiveSignals, context);
  const publicContributionPositiveSignalAgents = new Set(publicContributionPositiveSignals.map((signal) => signal.agent));
  const publicContributionPositiveSignalEvidence = new Set(publicContributionPositiveSignals.map((signal) => signal.evidence));
  const publicContributionPullUses = agentEvidenceRecords(publicContribution?.externalPullUses, context);
  const publicContributionPullUseAgents = new Set(publicContributionPullUses.map((pullUse) => pullUse.agent));
  const publicContributionPullUseEvidence = new Set(publicContributionPullUses.map((pullUse) => pullUse.evidence));
  const dreamInternalSkillEvidence = evidenceReferenceIdentity(dreamArtifacts?.internalSkill, context);
  const dreamPublicSkillEvidence = evidenceReferenceIdentity(dreamArtifacts?.publicSkill, context);
  const publishedArtifacts = asRecord(manifest.publishedArtifacts);
  const publishedArtifactsContributorAgent = textValue(publishedArtifacts?.contributorAgent);
  const publishedAntiPattern = publishedWorldArtifactReference(publishedArtifacts?.antiPattern, context, "antiPattern");
  const publishedTrace = publishedWorldArtifactReference(publishedArtifacts?.trace, context, "trace");
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
  const publicCanonicalSkill = githubCanonicalSkillReference(publicContribution?.canonicalSkill, context);
  const twoWeekCompetingSkillReferences = new Set(githubCanonicalSkillReferences(twoWeekImprovement?.competingSkillReferences, context));
  const twoWeekContributorAgent = textValue(twoWeekImprovement?.contributorAgent);
  const twoWeekRefinements = agentEvidenceRecords(twoWeekImprovement?.refinementEvidence, context);
  const twoWeekRefinementAgents = new Set(twoWeekRefinements.map((refinement) => refinement.agent));
  const twoWeekRefinementEvidence = new Set(twoWeekRefinements.map((refinement) => refinement.evidence));
  const loopContributorAgent = publicContributionContributorAgent;
  const publishedArtifactsUsesLoopContributor =
    loopContributorAgent !== undefined && publishedArtifactsContributorAgent === loopContributorAgent;
  const curationUsesLoopContributor = loopContributorAgent !== undefined && curationAgentContributor === loopContributorAgent;
  const twoWeekUsesLoopContributor = loopContributorAgent !== undefined && twoWeekContributorAgent === loopContributorAgent;

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
    v1Check(
      "providerSmokes",
      providerSmokeEvidenceCount === 3,
    ),
    v1Check("internalCredentialSmoke", evidenceReference(manifest.internalCredentialSmoke, context)),
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
    case "liveEnvFile.permissions":
      return {
        check,
        action: "Restrict the filled live-readiness env file to the current user before storing live secrets.",
        ...(context.envFilePath === undefined ? {} : { command: `chmod 600 ${shellQuote(context.envFilePath)}` }),
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
          'credentials add --path "$VIVARIUM_CREDENTIALS_PATH" --master-key "$VIVARIUM_CREDENTIALS_MASTER_KEY" --kind bearer --name "$VIVARIUM_INTERNAL_API_CREDENTIAL_NAME" --purpose "Call internal API" --value "$VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE"',
        ),
        guide: `${guide}#internal-api-credential`,
      };
    case "credentials.masterKey":
      return {
        check,
        action: "Export the local credential store master key used by credential smoke tests.",
        env: [credentialsMasterKeyEnv],
        guide: `${guide}#internal-api-credential`,
      };
    case "internalApi.credentialName":
      return {
        check,
        action: "Export the encrypted credential name used for the internal API smoke test.",
        env: [internalApiCredentialNameEnv],
        guide: `${guide}#internal-api-credential`,
      };
    case "internalApi.credentialValue":
      return {
        check,
        action: "Export the internal API credential value used to create the encrypted credential.",
        env: [internalApiCredentialValueEnv],
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
        action:
          "Record live init evidence showing distinct installed coding starter-pack skills, distinct installed starter traces, curriculum, and distinct first-run references.",
        guide: `${guide}#v1-evidence-manifest`,
      };
    case "v1.realGoals":
      return {
        check,
        action:
          "Record at least five distinct named real coding goals spanning a week, with domain, distinct evidence for each run, and dates that are not in the future.",
        guide: `${guide}#v1-evidence-manifest`,
      };
    case "v1.providerSmokes":
      return {
        check,
        action: "Record distinct successful Anthropic, OpenRouter, and private OpenAI-compatible provider smoke evidence.",
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
        action:
          "Record live behavior-loop evidence for anti-pattern use before unfamiliar territory, two distinct traces read that demonstrate similar workflows, Monitor tool-failure detection, Recover re-plan, one ordered destructive-endpoint run sequence that holds, escalates, receives confirmation, and continues, and refusal.",
        guide: `${guide}#v1-evidence-manifest`,
      };
    case "v1.dreamArtifacts":
      return {
        check,
        action:
          "Record nightly Dream evidence for two distinct skill candidates, distinct internal and public skills, proof the internal skill was pushed to the private fork only, one anti-pattern, and one trace auto-extracted from an instructive run with annotations.",
        guide: `${guide}#v1-evidence-manifest`,
      };
    case "v1.publicContribution":
      return {
        check,
        action:
          "Record the contributor agent identity, a GitHub public skill PR URL, math gate, contributor trust, K=5 distinct other-agent positive-signal agent/evidence records, a GitHub Actions auto-merge run URL, canonical world skill landing, and three distinct other-agent pull/use evidence records.",
        guide: `${guide}#v1-evidence-manifest`,
      };
    case "v1.publishedArtifacts":
      return {
        check,
        action:
          "Record published anti-pattern, trace, and run canonical-world GitHub blob refs, the contributor agent identity as the same public contribution contributor, and separate other-agent trace and run Plan-read agent/evidence records.",
        guide: `${guide}#v1-evidence-manifest`,
      };
    case "v1.curationStats":
      return {
        check,
        action:
          "Record featured pick evidence including a different contributor's anti-pattern, the same public contribution contributor as the curation agent contributor, plus STATS.md evidence showing at least 30% top-five contributor concentration.",
        guide: `${guide}#v1-evidence-manifest`,
      };
    case "v1.twoWeekImprovement":
      return {
        check,
        action:
          "Record the two-week follow-up at least fourteen days after the last goal with a date that is not in the future, faster follow-up metrics on similar goals, contributor profile counts/trust, contributor agent identity as the same public contribution contributor, a competing GitHub Discussion URL, two distinct live competing skill variant references, similar-goal comparison evidence, and two distinct other-agent refinement agent/evidence records excluding the contributor.",
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
  const nowMillis = options.nowMillis ?? Date.now();
  const worldRefs = worldSubscriptionRefs(env);
  const profiles = providerProfileNames(env);
  const nextActionContext: DoctorNextActionContext = {
    agentRoot,
    worldRoot,
    ...(options.envFilePath === undefined ? {} : { envFilePath: options.envFilePath }),
  };
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
    requiredEnvCheck(env, anthropicApiKeyEnv, "provider.anthropic"),
    requiredEnvCheck(env, openRouterApiKeyEnv, "provider.openrouter"),
    privateOaiCompatCheck(env),
    requiredFileCheck(env, providerProfilesPathEnv, "provider.profilesPath"),
    providerProfileCheck(env, profiles, anthropicProviderProfileEnv, "provider.anthropicProfile"),
    providerProfileCheck(env, profiles, openRouterProviderProfileEnv, "provider.openrouterProfile"),
    providerProfileCheck(env, profiles, privateOaiCompatProviderProfileEnv, "provider.privateOaiCompatProfile"),
    requiredFileCheck(env, credentialsPathEnv, "credentials.path"),
    requiredEnvCheck(env, credentialsMasterKeyEnv, "credentials.masterKey"),
    requiredEnvCheck(env, internalApiCredentialNameEnv, "internalApi.credentialName"),
    requiredEnvCheck(env, internalApiCredentialValueEnv, "internalApi.credentialValue"),
    requiredEnvCheck(env, internalApiHealthUrlEnv, "internalApi.healthUrl"),
    githubEnvCheck(env),
    requiredEnvCheck(env, githubOwnerEnv, "github.owner"),
    requiredEnvCheck(env, githubRepositoryIdEnv, "github.repositoryId"),
    requiredEnvCheck(env, githubDiscussionCategoryIdEnv, "github.discussionCategoryId"),
    githubAuthCheck(runner, env),
    ...dockerCheck(runner, env),
    ...v1EvidenceChecks(env, { agentRoot, worldRoot, nowMillis }),
  ];

  return {
    ok: checks.every(isPassingCheck),
    checks,
    nextActions: checks
      .filter((check) => !isPassingCheck(check))
      .map((check) => nextActionForCheck(check, nextActionContext)),
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
