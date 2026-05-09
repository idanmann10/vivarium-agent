import { createLocalWorldReader, type LocalWorldSearchResult } from "../../../../packages/world/src/index.js";

export interface SearchWorldCommandOptions {
  readonly worldRoot: string;
  readonly domain: string;
  readonly query: string;
  readonly limit?: number;
}

export interface SearchWorldCommandResult {
  readonly results: readonly LocalWorldSearchResult[];
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
