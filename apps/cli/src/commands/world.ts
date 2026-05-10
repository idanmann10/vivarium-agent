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

export interface VerifyWorldTransmissionCommandOptions extends PullWorldCommandOptions {
  readonly domain: string;
  readonly query: string;
  readonly limit?: number;
}

export interface VerifyWorldTransmissionCommandResult {
  readonly ok: boolean;
  readonly pull: PullWorldResult;
  readonly results: readonly LocalWorldSearchResult[];
  readonly error?: string;
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

export async function verifyWorldTransmissionCommand(
  options: VerifyWorldTransmissionCommandOptions,
): Promise<VerifyWorldTransmissionCommandResult> {
  const pull = await pullWorldCommand(options);
  const { results } = searchWorldCommand({
    worldRoot: options.destination,
    domain: options.domain,
    query: options.query,
    ...(options.limit === undefined ? {} : { limit: options.limit }),
  });

  if (results.length === 0) {
    return { ok: false, pull, results, error: "No world artifacts matched query" };
  }

  return { ok: true, pull, results };
}
