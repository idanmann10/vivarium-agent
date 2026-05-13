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
import { renderVivariumGlobe } from "./branding.js";

export type { PersistedWorldSubscription } from "../../../../packages/world/src/index.js";

export interface SearchWorldCommandOptions {
  readonly worldRoot?: string;
  readonly worlds?: readonly WorldSubscriptionSearch[];
  readonly subscriptionsPath?: string;
  readonly domain: string;
  readonly query: string;
  readonly limit?: number;
  readonly availableToolsets?: readonly string[];
  readonly availableTools?: readonly string[];
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

function renderSubscription(subscription: PersistedWorldSubscription): readonly string[] {
  return [
    `  ${subscription.label}`,
    `    Priority: ${subscription.priority}`,
    `    Root: ${subscription.root}`,
    ...(subscription.ref === undefined ? [] : [`    Ref: ${subscription.ref}`]),
    `    Auto-push: ${subscription.autoPushEnabled ? "enabled" : "disabled"}`,
  ];
}

export function renderWorldSubscriptionsCommandResult(result: WorldSubscriptionsCommandResult): string {
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium World Subscriptions",
    "---------------------------",
    `Subscriptions: ${result.subscriptions.length}`,
    ...(result.subscriptions.length === 0
      ? [
          "",
          "Next command:",
          "  vivarium world subscribe --subscriptions-path <path> --world-root <root> --world-label <label>",
        ]
      : ["", ...result.subscriptions.flatMap(renderSubscription)]),
    "",
  ].join("\n");
}

export function searchWorldCommand(options: SearchWorldCommandOptions): SearchWorldCommandResult {
  const request = {
    domain: options.domain,
    query: options.query,
    availableToolsets: options.availableToolsets ?? [],
    availableTools: options.availableTools ?? [],
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

function resultSource(result: LocalWorldSearchResult | SourcedWorldSearchResult): string | undefined {
  return "source" in result ? result.source : undefined;
}

function renderWorldSearchResult(result: LocalWorldSearchResult | SourcedWorldSearchResult): readonly string[] {
  const source = resultSource(result);
  return [
    `  ${source === undefined ? result.title : `${source}: ${result.title}`}`,
    `    Kind: ${result.kind}`,
    `    Score: ${result.score}`,
    `    Path: ${result.path}`,
  ];
}

export function renderSearchWorldCommandResult(result: SearchWorldCommandResult): string {
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium World Search",
    "---------------------",
    `Results: ${result.results.length}`,
    ...(result.results.length === 0
      ? [
          "",
          "Next command:",
          "  Check the world root, domain, query, and active tool availability.",
        ]
      : ["", ...result.results.flatMap(renderWorldSearchResult)]),
    "",
  ].join("\n");
}

export function pullWorldCommand(options: PullWorldCommandOptions): Promise<PullWorldResult> {
  return pullWorld(options);
}

export function renderPullWorldCommandResult(result: PullWorldResult): string {
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium World Pull",
    "-------------------",
    `Status: ${result.mode}`,
    `Remote: ${result.remote}`,
    `Destination: ${result.destination}`,
    ...(result.ref === undefined ? [] : [`Ref: ${result.ref}`]),
    "",
  ].join("\n");
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

export function renderVerifyWorldTransmissionCommandResult(result: VerifyWorldTransmissionCommandResult): string {
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium World Transmission",
    "---------------------------",
    `Status: ${result.ok ? "ok" : "blocked"}`,
    `Pull: ${result.pull.mode}`,
    `Remote: ${result.pull.remote}`,
    `Destination: ${result.pull.destination}`,
    ...(result.pull.ref === undefined ? [] : [`Ref: ${result.pull.ref}`]),
    `Results: ${result.results.length}`,
    ...(result.results.length === 0 ? [] : ["", ...result.results.flatMap(renderWorldSearchResult)]),
    ...(result.error === undefined ? [] : ["", `Error: ${result.error}`]),
    "",
  ].join("\n");
}
