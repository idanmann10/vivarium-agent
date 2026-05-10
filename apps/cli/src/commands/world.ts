import {
  createLocalWorldReader,
  pullWorld,
  type GitCommandRunner,
  type LocalWorldSearchResult,
  type PullWorldResult,
} from "../../../../packages/world/src/index.js";

export interface SearchWorldCommandOptions {
  readonly worldRoot: string;
  readonly domain: string;
  readonly query: string;
  readonly limit?: number;
}

export interface SearchWorldCommandResult {
  readonly results: readonly LocalWorldSearchResult[];
}

export interface PullWorldCommandOptions {
  readonly remote: string;
  readonly destination: string;
  readonly ref?: string;
  readonly runner?: GitCommandRunner;
}

export function searchWorldCommand(options: SearchWorldCommandOptions): SearchWorldCommandResult {
  const request = {
    domain: options.domain,
    query: options.query,
  };
  return {
    results: createLocalWorldReader({ root: options.worldRoot }).search(
      options.limit === undefined ? request : { ...request, limit: options.limit },
    ),
  };
}

export function pullWorldCommand(options: PullWorldCommandOptions): Promise<PullWorldResult> {
  return pullWorld(options);
}
