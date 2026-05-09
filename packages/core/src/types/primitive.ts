import type { RunId } from "../ids.js";
import type { AttentionUsage, CostClass, Identity } from "./agent.js";
import type { Episode } from "./episode.js";

export type PrimitiveTier = "reflexive" | "deliberate";

export type PrimitiveTrigger =
  | { readonly kind: "manual" }
  | { readonly kind: "goal-start" }
  | { readonly kind: "goal-end" }
  | { readonly kind: "before-tool" }
  | { readonly kind: "after-output" }
  | { readonly kind: "every-n-steps"; readonly n: number }
  | { readonly kind: "monitor-signal" }
  | { readonly kind: "scheduled"; readonly cron: string };

export type PreferredMode = "planner" | "executor" | "validator" | "reflector" | "consolidator";

export interface PrimitiveMeta {
  readonly name: string;
  readonly tier: PrimitiveTier;
  readonly costClass: CostClass;
  readonly trigger: PrimitiveTrigger;
  readonly preferredMode: PreferredMode;
}

export interface StateUpdate {
  readonly target: "memory" | "skill" | "identity" | "world" | "confidence";
  readonly description: string;
  readonly payload: unknown;
}

export interface LoopContext {
  readonly runId: RunId;
  readonly episodes: readonly Episode[];
  readonly identity: Identity;
  readonly attention: AttentionUsage;
}

export interface LoopResult {
  readonly episodes: readonly Episode[];
  readonly stateUpdates: readonly StateUpdate[];
}
