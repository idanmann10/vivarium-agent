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
      return {
        status: "running",
        ...(options.statePath === undefined ? {} : { statePath: options.statePath }),
        runs: state.listRuns().length,
        confidenceBuckets: state.listConfidenceBuckets().length,
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
