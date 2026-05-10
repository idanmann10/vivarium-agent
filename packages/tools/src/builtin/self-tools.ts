import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { RunId, SkillId } from "../../../core/src/ids.js";
import type { Episode, Run, TraceStep, Visibility } from "../../../core/src/index.js";
import type { LocalSkillRecord, StateRepository } from "../../../state/src/index.js";
import {
  listWorldSubscriptions,
  proposeRun,
  proposeSkillToSubscribedWorld,
  proposeTrace,
  searchWorlds,
  selectProposalWorldTarget,
  subscribeWorld,
  type LocalWorldReader,
  type LocalWorldSearchRequest,
  type LocalWorldSearchResult,
  type GitHubWorldClient,
  type NumberedGitHubUrl,
  type PersistedWorldSubscription,
  type ProposalWorldTarget,
  type SubscribeWorldRequest,
  type WorldSubscriptionSearch,
} from "../../../world/src/index.js";

export interface SelfToolsDependencies {
  readonly state: StateRepository;
  readonly world: LocalWorldReader;
  readonly github?: Pick<GitHubWorldClient, "createIssue">;
  readonly worldRoot?: string;
  readonly worldSubscriptionsPath?: string;
}

export interface MemoryWriteRequest {
  readonly domain: string;
  readonly subject: string;
  readonly content: string;
  readonly importance?: number;
}

export interface WorldProposeSkillRequest {
  readonly domain: string;
  readonly name: string;
  readonly description: string;
  readonly body: string;
  readonly contributor: string;
  readonly slug?: string;
  readonly visibility?: Visibility;
  readonly evidenceRunIds?: readonly string[];
}

export interface WorldProposeSkillResult {
  readonly target: ProposalWorldTarget;
  readonly path: string;
}

export interface WorldPullSkillRequest {
  readonly skillId: SkillId;
  readonly domain: string;
}

export interface WorldPullSkillResult {
  readonly skill: LocalSkillRecord;
  readonly source: LocalWorldSearchResult;
}

export interface WorldPublishRunRequest {
  readonly runId: RunId;
  readonly visibility: Visibility;
  readonly contributor: string;
}

export interface WorldPublishTraceRequest {
  readonly traceId: string;
  readonly visibility: Visibility;
  readonly contributor: string;
}

export interface WorldPublishResult {
  readonly target: ProposalWorldTarget;
  readonly path: string;
}

export interface WorldReportRegressionRequest {
  readonly skillId: SkillId;
  readonly reason: string;
  readonly domain?: string;
  readonly runId?: RunId;
}

export interface WorldReportRegressionResult {
  readonly candidateId: string;
  readonly issue?: NumberedGitHubUrl;
}

export interface WorldContributorSummary {
  readonly handle: string;
  readonly domains: readonly string[];
  readonly trustScore: number;
}

export interface SelfTools {
  readonly memory: {
    write(request: MemoryWriteRequest): { readonly id: string };
    recall(query: string, limit?: number): readonly string[];
    list(domain?: string): readonly string[];
    forget(id: string): boolean;
    summarize(): string;
  };
  readonly skills: {
    list(status?: string): readonly string[];
    habitual(domain?: string): readonly LocalWorldSearchResult[];
    search(query: string): readonly string[];
    view(id: SkillId): string | undefined;
    use(id: SkillId, helped?: boolean): void;
    lineage(id: SkillId): readonly string[];
  };
  readonly antiPatterns: {
    search(context: string, domain?: string): readonly LocalWorldSearchResult[];
    view(id: string, domain?: string): LocalWorldSearchResult | undefined;
    flag(skillId: SkillId, reason: string, domain?: string, runId?: RunId): { readonly id: string };
  };
  readonly traces: {
    search(topic: string, domain?: string): readonly LocalWorldSearchResult[];
    read(id: string, domain?: string): LocalWorldSearchResult | undefined;
    author(runId: RunId, annotations: readonly string[], domain?: string): { readonly id: string };
  };
  readonly runs: {
    create(run: Run): void;
    get(id: RunId): Run | undefined;
    update(run: Run): void;
    search(query: string, domain?: string): readonly Run[];
    read(id: RunId): { readonly run: Run; readonly episodes: readonly Episode[] } | undefined;
  };
  readonly episodes: {
    append(episode: Episode): void;
    list(runId: RunId): readonly Episode[];
  };
  readonly world: {
    search(request: LocalWorldSearchRequest): readonly LocalWorldSearchResult[];
    pull(request: WorldPullSkillRequest): WorldPullSkillResult;
    propose(request: WorldProposeSkillRequest): WorldProposeSkillResult;
    publishRun(request: WorldPublishRunRequest): WorldPublishResult;
    publishTrace(request: WorldPublishTraceRequest): WorldPublishResult;
    subscribe(request: Omit<SubscribeWorldRequest, "subscriptionsPath">): { readonly subscriptions: readonly PersistedWorldSubscription[] };
    listSubscriptions(): readonly PersistedWorldSubscription[];
    lineage(skillId: SkillId, domain: string): readonly string[];
    contributors(domain?: string): readonly WorldContributorSummary[];
    featured(): readonly string[];
    stats(): string;
    reportRegression(request: WorldReportRegressionRequest): Promise<WorldReportRegressionResult>;
  };
  readonly curriculum: {
    advance(domain: string, stepIndex: number): void;
  };
  readonly confidence: {
    record(confidence: number, correct: boolean): void;
  };
  readonly publishables: {
    queue(artifact: { readonly kind: "run" | "trace" | "skill" | "anti-pattern"; readonly path: string; readonly body: string }): void;
    list(): readonly { readonly kind: "run" | "trace" | "skill" | "anti-pattern"; readonly path: string; readonly body: string }[];
  };
}

function factId(domain: string, count: number): string {
  return `fact-${domain}-${count + 1}`;
}

function latestRunId(state: StateRepository, domain?: string): RunId | undefined {
  return state
    .listRuns()
    .filter((run) => domain === undefined || run.domain === domain)
    .at(-1)?.id;
}

function requireWorldSubscriptionsPath(worldSubscriptionsPath: string | undefined): string {
  if (worldSubscriptionsPath === undefined) {
    throw new Error("No world subscriptions path configured");
  }

  return worldSubscriptionsPath;
}

function worldRoots(worldRoot: string | undefined, worldSubscriptionsPath: string | undefined): readonly string[] {
  if (worldSubscriptionsPath !== undefined) {
    const subscriptions = listWorldSubscriptions(worldSubscriptionsPath);
    if (subscriptions.length > 0) {
      return subscriptions.map((subscription) => subscription.root);
    }
  }

  return worldRoot === undefined ? [] : [worldRoot];
}

function primaryWorldRoot(worldRoot: string | undefined, worldSubscriptionsPath: string | undefined): string {
  const roots = worldRoots(worldRoot, worldSubscriptionsPath);
  if (roots.length === 0) {
    throw new Error("No world root configured");
  }

  return roots[0]!;
}

function searchSubscribedWorlds(
  worlds: readonly WorldSubscriptionSearch[],
  request: LocalWorldSearchRequest,
): readonly LocalWorldSearchResult[] {
  return searchWorlds({ worlds, ...request });
}

function slugFromName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.length === 0 ? "skill" : slug;
}

function skillProposalBody(body: string, evidenceRunIds: readonly string[] = []): string {
  if (evidenceRunIds.length === 0) {
    return body;
  }

  return `${body}\n\n## Evidence\n\n${evidenceRunIds.map((id) => `- ${id}`).join("\n")}`;
}

function worldSearchResults(
  world: LocalWorldReader,
  worldSubscriptionsPath: string | undefined,
  request: LocalWorldSearchRequest,
): readonly LocalWorldSearchResult[] {
  if (worldSubscriptionsPath !== undefined) {
    const worlds = listWorldSubscriptions(worldSubscriptionsPath);
    if (worlds.length > 0) {
      return searchSubscribedWorlds(worlds, request);
    }
  }

  return world.search(request);
}

function targetForVisibility(worldSubscriptionsPath: string | undefined, visibility: Visibility): ProposalWorldTarget {
  return selectProposalWorldTarget({ worlds: listWorldSubscriptions(requireWorldSubscriptionsPath(worldSubscriptionsPath)), visibility });
}

function runOutcome(run: Run): string {
  if (run.success === true) {
    return "success";
  }

  if (run.success === false) {
    return "failure";
  }

  return "unknown";
}

function runTranscript(episodes: readonly Episode[]): string {
  return episodes.map((episode) => JSON.stringify(episode)).join("\n");
}

function localSkillSearchResult(skill: LocalSkillRecord): LocalWorldSearchResult {
  return {
    kind: "skill",
    id: String(skill.id),
    title: skill.name,
    path: `local:${String(skill.id)}`,
    score: Number.POSITIVE_INFINITY,
  };
}

function proposalTraceSteps(steps: readonly TraceStep[]): readonly { readonly action: string; readonly annotation: string }[] {
  return steps.map((step) => ({
    action: step.action,
    annotation: step.annotation ?? "No annotation supplied.",
  }));
}

function frontmatterValue(text: string, key: string): string | undefined {
  return text
    .split("\n")
    .find((line) => line.startsWith(`${key}:`))
    ?.slice(key.length + 1)
    .trim();
}

function localSkillStatus(value: string | undefined): LocalSkillRecord["status"] {
  return value === "candidate" || value === "promoted" || value === "deprecated" || value === "archived" ? value : "candidate";
}

function pulledSkillRecord(id: SkillId, domain: string, body: string): LocalSkillRecord {
  return {
    id,
    name: frontmatterValue(body, "name") ?? String(id),
    domain,
    status: localSkillStatus(frontmatterValue(body, "status")),
    uses: 0,
    helped: 0,
    lastUsedRunOffset: 0,
    habitual: false,
    body,
  };
}

function recordSkillRegression(
  state: StateRepository,
  request: Required<Pick<WorldReportRegressionRequest, "skillId" | "reason" | "domain">> & Pick<WorldReportRegressionRequest, "runId">,
): string {
  const candidateId = `anti-pattern-${String(request.skillId)}`;
  state.upsertAntiPatternCandidate({
    id: candidateId,
    domain: request.domain,
    name: `Regression: ${String(request.skillId)}`,
    description: `Skill ${String(request.skillId)} produced a reported regression.`,
    why: request.reason,
    insteadDo: "Review the regression before using this skill again.",
    evidenceRunIds: request.runId === undefined ? [] : [String(request.runId)],
    createdAt: new Date().toISOString(),
  });
  return candidateId;
}

interface ContributorJson {
  readonly handle?: string;
  readonly domains?: readonly string[];
  readonly trustScore?: number;
}

interface LineageJson {
  readonly id?: string;
  readonly inspired_by?: readonly string[];
  readonly competes_with?: readonly string[];
}

function contributorSummaries(root: string, domain?: string): readonly WorldContributorSummary[] {
  const contributorsRoot = join(root, "contributors");
  if (!existsSync(contributorsRoot)) {
    return [];
  }

  return readdirSync(contributorsRoot)
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => JSON.parse(readFileSync(join(contributorsRoot, entry), "utf8")) as ContributorJson)
    .filter((profile): profile is Required<Pick<ContributorJson, "handle" | "domains" | "trustScore">> => {
      return profile.handle !== undefined && profile.domains !== undefined && profile.trustScore !== undefined;
    })
    .filter((profile) => domain === undefined || profile.domains.includes(domain))
    .map((profile) => ({
      handle: profile.handle,
      domains: profile.domains,
      trustScore: profile.trustScore,
    }))
    .toSorted((left, right) => right.trustScore - left.trustScore || left.handle.localeCompare(right.handle));
}

function featuredIds(root: string): readonly string[] {
  const path = join(root, "featured", "current.md");
  if (!existsSync(path)) {
    return [];
  }

  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter((line) => line.length > 0);
}

export function createSelfTools({ state, world, github, worldRoot, worldSubscriptionsPath }: SelfToolsDependencies): SelfTools {
  return {
    memory: {
      write(request) {
        const id = factId(request.domain, state.listSemanticFacts().length);
        state.upsertSemanticFact({
          id,
          domain: request.domain,
          subject: request.subject,
          fact: request.content,
          confidence: request.importance ?? 0.5,
          derivedFromEpisodeIds: [],
          updatedAt: new Date().toISOString(),
        });
        return { id };
      },
      recall(query, limit = 5) {
        const needle = query.toLowerCase();
        return state
          .listSemanticFacts()
          .filter((fact) => `${fact.subject} ${fact.fact}`.toLowerCase().includes(needle))
          .slice(0, limit)
          .map((fact) => fact.fact);
      },
      list(domain) {
        return state.listSemanticFacts(domain).map((fact) => fact.fact);
      },
      forget(id) {
        return state.deleteSemanticFact(id);
      },
      summarize() {
        return state.getIdentity()?.summary ?? "No identity summary recorded yet.";
      },
    },
    skills: {
      list(status) {
        return state
          .listLocalSkills()
          .filter((skill) => status === undefined || skill.status === status)
          .map((skill) => String(skill.id));
      },
      habitual(domain) {
        return state
          .listLocalSkills()
          .filter(
            (skill) =>
              skill.habitual && skill.status === "promoted" && (domain === undefined || skill.domain === domain),
          )
          .sort((left, right) => right.uses - left.uses)
          .slice(0, 5)
          .map(localSkillSearchResult);
      },
      search(query) {
        const needle = query.toLowerCase();
        return state
          .listLocalSkills()
          .filter((skill) => `${skill.name} ${skill.body}`.toLowerCase().includes(needle))
          .map((skill) => String(skill.id));
      },
      view(id) {
        return state.listLocalSkills().find((skill) => skill.id === id)?.body;
      },
      use(id, helped = false) {
        const skill = state.listLocalSkills().find((candidate) => candidate.id === id);
        if (skill === undefined) {
          return;
        }

        state.upsertLocalSkill({
          ...skill,
          uses: skill.uses + 1,
          helped: skill.helped + (helped ? 1 : 0),
        });
      },
      lineage(id) {
        return [String(id)];
      },
    },
    antiPatterns: {
      search(context, domain = "coding") {
        return world.search({ domain, query: context }).filter((result) => result.kind === "anti-pattern");
      },
      view(id, domain = "coding") {
        return world.search({ domain, query: id }).find((result) => result.kind === "anti-pattern" && result.id === id);
      },
      flag(skillId, reason, domain = "coding", runId = latestRunId(state, domain)) {
        const id = `anti-pattern-${String(skillId)}`;
        state.upsertAntiPatternCandidate({
          id,
          domain,
          name: `Flag ${String(skillId)}`,
          description: `Skill ${String(skillId)} led toward an anti-pattern.`,
          why: reason,
          insteadDo: "Review the anti-pattern before using this skill again.",
          evidenceRunIds: runId === undefined ? [] : [String(runId)],
          createdAt: new Date().toISOString(),
        });
        return { id };
      },
    },
    traces: {
      search(topic, domain = "coding") {
        return world.search({ domain, query: topic }).filter((result) => result.kind === "trace");
      },
      read(id, domain = "coding") {
        return world.search({ domain, query: id }).find((result) => result.kind === "trace" && result.id === id);
      },
      author(runId, annotations, domain = state.getRun(runId)?.domain ?? "coding") {
        const id = `trace-${String(runId)}`;
        const steps: TraceStep[] = annotations.map((annotation, index) => ({
          index: index + 1,
          action: `Annotate run ${String(runId)}`,
          annotation,
        }));
        state.upsertTraceCandidate({
          id,
          domain,
          title: `Trace for ${String(runId)}`,
          sourceRunId: runId,
          teaches: [domain],
          steps,
          createdAt: new Date().toISOString(),
        });
        return { id };
      },
    },
    runs: {
      create(run) {
        state.createRun(run);
      },
      get(id) {
        return state.getRun(id);
      },
      update(run) {
        state.updateRun(run);
      },
      search(query, domain) {
        const needle = query.toLowerCase();
        return state
          .listRuns()
          .filter((run) => domain === undefined || run.domain === domain)
          .filter((run) => `${run.goal} ${run.notes}`.toLowerCase().includes(needle));
      },
      read(id) {
        const run = state.getRun(id);
        return run === undefined ? undefined : { run, episodes: state.listEpisodes(id) };
      },
    },
    episodes: {
      append(episode) {
        state.appendEpisode(episode);
      },
      list(runId) {
        return state.listEpisodes(runId);
      },
    },
    world: {
      search(request) {
        return worldSearchResults(world, worldSubscriptionsPath, request);
      },
      pull(request) {
        const source = worldSearchResults(world, worldSubscriptionsPath, {
          domain: request.domain,
          query: String(request.skillId),
          limit: 8,
        }).find((result) => {
          if (result.kind !== "skill") {
            return false;
          }

          return frontmatterValue(readFileSync(result.path, "utf8"), "id") === String(request.skillId);
        });
        if (source === undefined) {
          throw new Error(`World skill not found: ${String(request.skillId)}`);
        }

        const skill = pulledSkillRecord(request.skillId, request.domain, readFileSync(source.path, "utf8"));
        state.upsertLocalSkill(skill);
        return { skill, source };
      },
      propose(request) {
        return proposeSkillToSubscribedWorld({
          worlds: listWorldSubscriptions(requireWorldSubscriptionsPath(worldSubscriptionsPath)),
          domain: request.domain,
          slug: request.slug ?? slugFromName(request.name),
          name: request.name,
          description: request.description,
          body: skillProposalBody(request.body, request.evidenceRunIds),
          contributor: request.contributor,
          visibility: request.visibility ?? "public",
        });
      },
      publishRun(request) {
        const run = state.getRun(request.runId);
        if (run === undefined) {
          throw new Error(`Run not found: ${String(request.runId)}`);
        }

        const target = targetForVisibility(worldSubscriptionsPath, request.visibility);
        const path = proposeRun({
          worldRoot: target.root,
          runId: String(run.id),
          domain: run.domain,
          goal: run.goal,
          outcome: runOutcome(run),
          contributor: request.contributor,
          body: runTranscript(state.listEpisodes(run.id)),
          sourceRunId: String(run.id),
          visibility: request.visibility,
        });
        state.updateRun({ ...run, published: true, publishedAt: new Date().toISOString(), visibility: request.visibility });

        return { target, path };
      },
      publishTrace(request) {
        const trace = state.listTraceCandidates().find((candidate) => candidate.id === request.traceId);
        if (trace === undefined) {
          throw new Error(`Trace candidate not found: ${request.traceId}`);
        }

        const target = targetForVisibility(worldSubscriptionsPath, request.visibility);
        const path = proposeTrace({
          worldRoot: target.root,
          domain: trace.domain,
          slug: trace.id,
          title: trace.title,
          contributor: request.contributor,
          steps: proposalTraceSteps(trace.steps),
          evidenceRunId: String(trace.sourceRunId),
          visibility: request.visibility,
        });

        return { target, path };
      },
      subscribe(request) {
        return {
          subscriptions: subscribeWorld({
            ...request,
            subscriptionsPath: requireWorldSubscriptionsPath(worldSubscriptionsPath),
          }),
        };
      },
      listSubscriptions() {
        if (worldSubscriptionsPath === undefined) {
          return [];
        }

        return listWorldSubscriptions(worldSubscriptionsPath);
      },
      lineage(id, domain) {
        const source = worldSearchResults(world, worldSubscriptionsPath, { domain, query: String(id), limit: 8 }).find((result) => {
          return result.kind === "skill" && frontmatterValue(readFileSync(result.path, "utf8"), "id") === String(id);
        });
        if (source === undefined) {
          return [String(id)];
        }

        const lineagePath = source.path.replace(/SKILL\.md$/, "lineage.json");
        if (!existsSync(lineagePath)) {
          return [String(id)];
        }

        const lineage = JSON.parse(readFileSync(lineagePath, "utf8")) as LineageJson;
        return [lineage.id ?? String(id), ...(lineage.inspired_by ?? []), ...(lineage.competes_with ?? [])];
      },
      contributors(domain) {
        return worldRoots(worldRoot, worldSubscriptionsPath).flatMap((root) => contributorSummaries(root, domain));
      },
      featured() {
        return featuredIds(primaryWorldRoot(worldRoot, worldSubscriptionsPath));
      },
      stats() {
        return readFileSync(join(primaryWorldRoot(worldRoot, worldSubscriptionsPath), "STATS.md"), "utf8");
      },
      async reportRegression(request) {
        const domain = request.domain ?? "coding";
        const runId = request.runId ?? latestRunId(state, domain);
        const candidateId = recordSkillRegression(
          state,
          runId === undefined
            ? { skillId: request.skillId, reason: request.reason, domain }
            : { skillId: request.skillId, reason: request.reason, domain, runId },
        );
        const issue = await github?.createIssue({
          title: `Regression: ${String(request.skillId)}`,
          body:
            `Skill: ${String(request.skillId)}\n\n` +
            `Domain: ${domain}\n\n` +
            `Reason:\n${request.reason}\n\n` +
            `Evidence run: ${runId === undefined ? "not supplied" : String(runId)}`,
          labels: ["regression", "skill-regression", `domain:${domain}`],
        });

        return issue === undefined ? { candidateId } : { candidateId, issue };
      },
    },
    curriculum: {
      advance(domain, stepIndex) {
        state.advanceCurriculum(domain, stepIndex);
      },
    },
    confidence: {
      record(confidence, correct) {
        state.recordPredictionOutcome({ confidence, correct });
      },
    },
    publishables: {
      queue(artifact) {
        state.queuePublishableArtifact(artifact);
      },
      list() {
        return state.listPublishableArtifacts();
      },
    },
  };
}
