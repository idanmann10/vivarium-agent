import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import type { WorldSubscriptionSearch } from "./retrieve.js";

export interface PersistedWorldSubscription extends WorldSubscriptionSearch {
  readonly ref?: string;
  readonly autoPushEnabled: boolean;
}

export interface WorldSubscriptionsStoreOptions {
  readonly subscriptionsPath: string;
}

export interface SubscribeWorldRequest extends WorldSubscriptionsStoreOptions {
  readonly label: string;
  readonly root: string;
  readonly priority?: number;
  readonly ref?: string;
  readonly autoPushEnabled?: boolean;
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

export function listWorldSubscriptions(subscriptionsPath: string): readonly PersistedWorldSubscription[] {
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

export function subscribeWorld(options: SubscribeWorldRequest): readonly PersistedWorldSubscription[] {
  const existing = listWorldSubscriptions(options.subscriptionsPath);
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
  return next;
}
