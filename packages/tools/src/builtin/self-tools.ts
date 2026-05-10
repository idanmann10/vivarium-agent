import type { RunId, SkillId } from "../../../core/src/ids.js";
import type { Episode, Run, TraceStep, Visibility } from "../../../core/src/index.js";
import type { StateRepository } from "../../../state/src/index.js";
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
  type PersistedWorldSubscription,
  type ProposalWorldTarget,
  type SubscribeWorldRequest,
  type WorldSubscriptionSearch,
} from "../../../world/src/index.js";

export interface SelfToolsDependencies {
  readonly state: StateRepository;
  readonly world: LocalWorldReader;
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
    propose(request: WorldProposeSkillRequest): WorldProposeSkillResult;
    publishRun(request: WorldPublishRunRequest): WorldPublishResult;
    publishTrace(request: WorldPublishTraceRequest): WorldPublishResult;
    subscribe(request: Omit<SubscribeWorldRequest, "subscriptionsPath">): { readonly subscriptions: readonly PersistedWorldSubscription[] };
    listSubscriptions(): readonly PersistedWorldSubscription[];
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

function proposalTraceSteps(steps: readonly TraceStep[]): readonly { readonly action: string; readonly annotation: string }[] {
  return steps.map((step) => ({
    action: step.action,
    annotation: step.annotation ?? "No annotation supplied.",
  }));
}

export function createSelfTools({ state, world, worldSubscriptionsPath }: SelfToolsDependencies): SelfTools {
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
        if (worldSubscriptionsPath !== undefined) {
          const worlds = listWorldSubscriptions(worldSubscriptionsPath);
          if (worlds.length > 0) {
            return searchSubscribedWorlds(worlds, request);
          }
        }

        return world.search(request);
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
