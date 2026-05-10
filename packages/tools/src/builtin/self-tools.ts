import type { RunId, SkillId } from "../../../core/src/ids.js";
import type { Episode, Run, TraceStep } from "../../../core/src/index.js";
import type { StateRepository } from "../../../state/src/index.js";
import type { LocalWorldReader, LocalWorldSearchRequest, LocalWorldSearchResult } from "../../../world/src/index.js";

export interface SelfToolsDependencies {
  readonly state: StateRepository;
  readonly world: LocalWorldReader;
}

export interface MemoryWriteRequest {
  readonly domain: string;
  readonly subject: string;
  readonly content: string;
  readonly importance?: number;
}

export interface SelfTools {
  readonly memory: {
    write(request: MemoryWriteRequest): { readonly id: string };
    recall(query: string, limit?: number): readonly string[];
    list(domain?: string): readonly string[];
    forget(id: string): false;
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
  };
  readonly curriculum: {
    advance(domain: string, stepIndex: number): void;
  };
  readonly confidence: {
    record(confidence: number, correct: boolean): void;
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

export function createSelfTools({ state, world }: SelfToolsDependencies): SelfTools {
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
      forget() {
        return false;
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
        return world.search(request);
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
  };
}
