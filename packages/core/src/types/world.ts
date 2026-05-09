import type { WorldRef } from "../ids.js";

export interface WorldSearchResult {
  readonly ref: WorldRef;
  readonly kind: "skill" | "anti-pattern" | "trace" | "run" | "curriculum";
  readonly id: string;
  readonly title: string;
  readonly score: number;
}

export interface WorldProposal {
  readonly target: WorldRef;
  readonly kind: "skill" | "anti-pattern" | "trace" | "run";
  readonly path: string;
  readonly summary: string;
}
