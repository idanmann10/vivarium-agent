import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import {
  createLocalWorldReader,
  pullWorld,
  searchWorlds,
  type GitCommandRunner,
  type LocalWorldSearchResult,
  type PullWorldResult,
  type SourcedWorldSearchResult,
  type WorldSubscriptionSearch,
} from "../../../../packages/world/src/index.js";

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

export interface PersistedWorldSubscription extends WorldSubscriptionSearch {
  readonly ref?: string;
  readonly autoPushEnabled: boolean;
}

export interface WorldSubscriptionsCommandOptions {
  readonly subscriptionsPath: string;
}

export interface SubscribeWorldCommandOptions extends WorldSubscriptionsCommandOptions {
  readonly label: string;
  readonly root: string;
  readonly priority?: number;
  readonly ref?: string;
  readonly autoPushEnabled?: boolean;
}

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

interface WorldSubscriptionsFile {
  readonly worlds?: readonly Partial<PersistedWorldSubscription>[];
}

function normalizeSubscriptions(subscriptions: readonly PersistedWorldSubscription[]): readonly PersistedWorldSubscription[] {
  return [...subscriptions].toSorted((left, right) => left.priority - right.priority || left.label.localeCompare(right.label));
}

function parseSubscription(raw: Partial<PersistedWorldSubscription>, index: number): PersistedWorldSubscription {
  if (typeof raw.label !== "string" || raw.label.trim().length === 0) {
    throw new Error(`World subscription ${index + 1} is missing label`);
  }
  if (typeof raw.root !== "string" || raw.root.trim().length === 0) {
    throw new Error(`World subscription ${raw.label} is missing root`);
  }
  if (typeof raw.priority !== "number" || !Number.isInteger(raw.priority)) {
    throw new Error(`World subscription ${raw.label} is missing integer priority`);
  }

  const subscription = {
    label: raw.label,
    root: raw.root,
    priority: raw.priority,
    autoPushEnabled: raw.autoPushEnabled ?? false,
  };

  return raw.ref === undefined ? subscription : { ...subscription, ref: raw.ref };
}

function readWorldSubscriptions(subscriptionsPath: string): readonly PersistedWorldSubscription[] {
  if (!existsSync(subscriptionsPath)) {
    return [];
  }

  const parsed = JSON.parse(readFileSync(subscriptionsPath, "utf8")) as WorldSubscriptionsFile;
  return normalizeSubscriptions((parsed.worlds ?? []).map(parseSubscription));
}

function writeWorldSubscriptions(subscriptionsPath: string, subscriptions: readonly PersistedWorldSubscription[]): void {
  mkdirSync(dirname(subscriptionsPath), { recursive: true });
  writeFileSync(subscriptionsPath, `${JSON.stringify({ worlds: normalizeSubscriptions(subscriptions) }, null, 2)}\n`, "utf8");
}

export function listWorldSubscriptionsCommand(options: WorldSubscriptionsCommandOptions): WorldSubscriptionsCommandResult {
  return { subscriptions: readWorldSubscriptions(options.subscriptionsPath) };
}

export function subscribeWorldCommand(options: SubscribeWorldCommandOptions): WorldSubscriptionsCommandResult {
  const existing = readWorldSubscriptions(options.subscriptionsPath);
  const previous = existing.find((subscription) => subscription.label === options.label);
  const priority = options.priority ?? previous?.priority ?? existing.length;
  const autoPushEnabled = options.autoPushEnabled ?? previous?.autoPushEnabled ?? false;
  const ref = options.ref ?? previous?.ref;
  const subscription = {
    label: options.label,
    root: options.root,
    priority,
    autoPushEnabled,
  } satisfies PersistedWorldSubscription;
  const next = normalizeSubscriptions([
    ...existing.filter((candidate) => candidate.label !== options.label),
    ref === undefined ? subscription : { ...subscription, ref },
  ]);

  writeWorldSubscriptions(options.subscriptionsPath, next);
  return { subscriptions: next };
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
        worlds: readWorldSubscriptions(options.subscriptionsPath),
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
