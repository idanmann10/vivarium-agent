import {
  createLocalWorldReader,
  listWorldSubscriptions,
  pullWorld,
  searchWorlds,
  subscribeWorld,
  type GitCommandRunner,
  type LocalWorldSearchResult,
  type PersistedWorldSubscription,
  type PullWorldResult,
  type SourcedWorldSearchResult,
  type SubscribeWorldRequest,
  type WorldSubscriptionSearch,
} from "../../../../packages/world/src/index.js";

export type { PersistedWorldSubscription } from "../../../../packages/world/src/index.js";

export interface SearchWorldCommandOptions {
  readonly worldRoot?: string;
  readonly worlds?: readonly WorldSubscriptionSearch[];
  readonly subscriptionsPath?: string;
  readonly domain: string;
  readonly query: string;
  readonly limit?: number;
}

export interface SearchWorldCommandResult {
  readonly results: readonly (LocalWorldSearchResult | SourcedWorldSearchResult)[];
}

export interface WorldSubscriptionsCommandOptions {
  readonly subscriptionsPath: string;
}

export interface SubscribeWorldCommandOptions extends SubscribeWorldRequest {}

export interface WorldSubscriptionsCommandResult {
  readonly subscriptions: readonly PersistedWorldSubscription[];
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

export function listWorldSubscriptionsCommand(options: WorldSubscriptionsCommandOptions): WorldSubscriptionsCommandResult {
  return { subscriptions: listWorldSubscriptions(options.subscriptionsPath) };
}

export function subscribeWorldCommand(options: SubscribeWorldCommandOptions): WorldSubscriptionsCommandResult {
  return { subscriptions: subscribeWorld(options) };
}

export function searchWorldCommand(options: SearchWorldCommandOptions): SearchWorldCommandResult {
  const request = {
    domain: options.domain,
    query: options.query,
  };

  if (options.worlds !== undefined && options.worlds.length > 0) {
    return {
      results: searchWorlds({
        worlds: options.worlds,
        ...request,
        ...(options.limit === undefined ? {} : { limit: options.limit }),
      }),
    };
  }

  if (options.subscriptionsPath !== undefined) {
    return {
      results: searchWorlds({
        worlds: listWorldSubscriptions(options.subscriptionsPath),
        ...request,
        ...(options.limit === undefined ? {} : { limit: options.limit }),
      }),
    };
  }

  if (options.worldRoot === undefined) {
    throw new Error("Missing worldRoot, worlds, or subscriptionsPath");
  }

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
