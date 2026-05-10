export const retrieveInputs = ["goal", "domain", "identity"] as const;

import { createLocalWorldReader, type LocalWorldSearchResult } from "./local-reader.js";

export interface WorldSubscriptionSearch {
  readonly label: string;
  readonly root: string;
  readonly priority: number;
}

export interface SearchWorldsRequest {
  readonly worlds: readonly WorldSubscriptionSearch[];
  readonly domain: string;
  readonly query: string;
  readonly limit?: number;
  readonly availableToolsets?: readonly string[];
  readonly availableTools?: readonly string[];
}

export interface SourcedWorldSearchResult extends LocalWorldSearchResult {
  readonly source: string;
  readonly priority: number;
}

export function searchWorlds(request: SearchWorldsRequest): readonly SourcedWorldSearchResult[] {
  return request.worlds
    .toSorted((left, right) => left.priority - right.priority)
    .flatMap((world) =>
      createLocalWorldReader({ root: world.root })
        .search({
          domain: request.domain,
          query: request.query,
          limit: request.limit ?? 5,
          availableToolsets: request.availableToolsets ?? [],
          availableTools: request.availableTools ?? [],
        })
        .map((result) => ({ ...result, source: world.label, priority: world.priority })),
    );
}
