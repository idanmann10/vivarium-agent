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
      return {
        status: "running",
        ...(options.statePath === undefined ? {} : { statePath: options.statePath }),
        runs: runs.length,
        confidenceBuckets: state.listConfidenceBuckets().length,
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
