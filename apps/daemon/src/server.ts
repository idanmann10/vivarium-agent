import type { Run } from "../../../packages/core/src/index.js";
import type { DreamDomainStats, DreamResult, RunGoalResult } from "../../../packages/runtime/src/index.js";
import { createLocalProvider } from "../../../packages/providers/src/index.js";
import { runDream, runGoal } from "../../../packages/runtime/src/index.js";
import {
  InMemoryStateRepository,
  SQLiteStateRepository,
  type StateRepository,
} from "../../../packages/state/src/index.js";
import { createSelfTools } from "../../../packages/tools/src/index.js";
import { createLocalWorldReader } from "../../../packages/world/src/index.js";

export interface DaemonServerOptions {
  readonly statePath?: string;
  readonly worldRoot: string;
}

export interface DaemonStatus {
  readonly status: "running";
  readonly statePath?: string;
  readonly runs: number;
  readonly confidenceBuckets: number;
  readonly skills: {
    readonly total: number;
    readonly promoted: number;
    readonly candidates: number;
    readonly archived: number;
    readonly habitual: number;
  };
  readonly memory: {
    readonly semanticFacts: number;
    readonly traceCandidates: number;
    readonly antiPatternCandidates: number;
    readonly publishableArtifacts: number;
    readonly identityName?: string;
    readonly identitySummary?: string;
  };
  readonly domains: readonly {
    readonly name: string;
    readonly runs: number;
    readonly skills: number;
    readonly successRate: number;
    readonly latestGoal?: string;
  }[];
  readonly recentRuns: readonly {
    readonly id: string;
    readonly goal: string;
    readonly domain: string;
    readonly success: boolean | null;
    readonly score: number | null;
  }[];
  readonly latestRun?: {
    readonly id: string;
    readonly goal: string;
    readonly domain: string;
    readonly success: boolean | null;
    readonly score: number | null;
  };
}

export interface DaemonRunRequest {
  readonly goal: string;
  readonly domain: string;
}

export interface DaemonServer {
  status(): DaemonStatus;
  run(request: DaemonRunRequest): Promise<RunGoalResult>;
  dream(domainStats: Readonly<Record<string, DreamDomainStats>>): DreamResult;
}

function latestRun(runs: readonly Run[]): Run | undefined {
  return [...runs].sort((left, right) => {
    const leftTime = left.endedAt ?? left.startedAt;
    const rightTime = right.endedAt ?? right.startedAt;
    return rightTime.localeCompare(leftTime);
  })[0];
}

function sortedRuns(runs: readonly Run[]): readonly Run[] {
  return [...runs].sort((left, right) => {
    const leftTime = left.endedAt ?? left.startedAt;
    const rightTime = right.endedAt ?? right.startedAt;
    return rightTime.localeCompare(leftTime);
  });
}

function runSummary(run: Run): DaemonStatus["recentRuns"][number] {
  return {
    id: String(run.id),
    goal: run.goal,
    domain: run.domain,
    success: run.success,
    score: run.score,
  };
}

function domainSummaries(state: StateRepository, runs: readonly Run[]): DaemonStatus["domains"] {
  const skills = state.listLocalSkills();
  const domains = new Map<
    string,
    {
      runs: Run[];
      skills: number;
    }
  >();

  for (const run of runs) {
    const current = domains.get(run.domain) ?? { runs: [], skills: 0 };
    current.runs.push(run);
    domains.set(run.domain, current);
  }

  for (const skill of skills) {
    const current = domains.get(skill.domain) ?? { runs: [], skills: 0 };
    current.skills += 1;
    domains.set(skill.domain, current);
  }

  return [...domains.entries()]
    .map(([name, value]) => {
      const completedRuns = value.runs.filter((run) => run.success !== null);
      const successfulRuns = completedRuns.filter((run) => run.success === true);
      const newestRun = latestRun(value.runs);
      return {
        name,
        runs: value.runs.length,
        skills: value.skills,
        successRate: completedRuns.length === 0 ? 0 : successfulRuns.length / completedRuns.length,
        ...(newestRun === undefined ? {} : { latestGoal: newestRun.goal }),
      };
    })
    .sort((left, right) => right.runs - left.runs || right.skills - left.skills || left.name.localeCompare(right.name))
    .slice(0, 5);
}

export function createDaemonServer(options: DaemonServerOptions = { worldRoot: "../the-world" }): DaemonServer {
  const state: StateRepository =
    options.statePath === undefined
      ? new InMemoryStateRepository()
      : new SQLiteStateRepository(options.statePath);
  const provider = createLocalProvider({ id: "daemon-local", costClass: "medium", capabilities: ["chat", "json_mode"] });
  const tools = createSelfTools({
    state,
    world: createLocalWorldReader({ root: options.worldRoot }),
  });

  return {
    status() {
      const runs = state.listRuns();
      const run = latestRun(runs);
      const skills = state.listLocalSkills();
      const identity = state.getIdentity();
      return {
        status: "running",
        ...(options.statePath === undefined ? {} : { statePath: options.statePath }),
        runs: runs.length,
        confidenceBuckets: state.listConfidenceBuckets().length,
        skills: {
          total: skills.length,
          promoted: skills.filter((skill) => skill.status === "promoted").length,
          candidates: skills.filter((skill) => skill.status === "candidate").length,
          archived: skills.filter((skill) => skill.status === "archived").length,
          habitual: skills.filter((skill) => skill.habitual).length,
        },
        memory: {
          semanticFacts: state.listSemanticFacts().length,
          traceCandidates: state.listTraceCandidates().length,
          antiPatternCandidates: state.listAntiPatternCandidates().length,
          publishableArtifacts: state.listPublishableArtifacts().length,
          ...(identity === undefined
            ? {}
            : {
                identityName: identity.name,
                identitySummary: identity.summary,
              }),
        },
        domains: domainSummaries(state, runs),
        recentRuns: sortedRuns(runs).slice(0, 5).map(runSummary),
        ...(run === undefined
          ? {}
          : {
              latestRun: {
                id: String(run.id),
                goal: run.goal,
                domain: run.domain,
                success: run.success,
                score: run.score,
              },
            }),
      };
    },
    run(request) {
      return runGoal({
        goal: request.goal,
        domain: request.domain,
        agentName: "daemon-local-agent",
        provider,
        tools,
      });
    },
    dream(domainStats) {
      return runDream({ state, domainStats });
    },
  };
}
