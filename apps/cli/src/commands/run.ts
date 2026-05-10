import type { Episode } from "../../../../packages/core/src/index.js";
import { createLocalProvider } from "../../../../packages/providers/src/index.js";
import { runGoal } from "../../../../packages/runtime/src/index.js";
import { InMemoryStateRepository, SQLiteStateRepository, type StateRepository } from "../../../../packages/state/src/index.js";
import { createSelfTools } from "../../../../packages/tools/src/index.js";
import { createLocalWorldReader } from "../../../../packages/world/src/index.js";

export interface RunCommandOptions {
  readonly goal: string;
  readonly domain?: string;
  readonly worldRoot?: string;
  readonly statePath?: string;
  readonly forceFailure?: boolean;
}

export function describeRunCommand(options: RunCommandOptions): string {
  return options.domain === undefined ? options.goal : `${options.domain}: ${options.goal}`;
}

export interface RunCommandResult {
  readonly success: boolean;
  readonly runId: string;
  readonly episodeKinds: readonly Episode["kind"][];
}

export async function runCommand(options: RunCommandOptions): Promise<RunCommandResult> {
  const state: StateRepository = options.statePath === undefined ? new InMemoryStateRepository() : new SQLiteStateRepository(options.statePath);
  const provider = createLocalProvider({ id: "local", costClass: "medium", capabilities: ["chat", "json_mode"] });
  const tools = createSelfTools({
    state,
    world: createLocalWorldReader({ root: options.worldRoot ?? "../the-world" }),
  });
  const request = {
    goal: options.goal,
    domain: options.domain ?? "coding",
    agentName: "local-cli-agent",
    provider,
    tools,
  };
  const result = await runGoal(
    options.forceFailure === undefined ? request : { ...request, forceFailure: options.forceFailure },
  );
  const episodeKinds = state.listEpisodes(result.runId).map((episode) => episode.kind);
  if (state instanceof SQLiteStateRepository) {
    state.close();
  }

  return {
    success: result.success,
    runId: String(result.runId),
    episodeKinds,
  };
}
