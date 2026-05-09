import type { Episode } from "../../core/src/index.js";
import type { LocalWorldSearchResult } from "../../world/src/index.js";

export const defaultAttentionLimits = {
  maxSkillsInContext: 8,
  maxToolsActive: 20,
  maxWorkingTokens: 12_000,
  maxEpisodesInContext: 5,
} as const;

export interface AttentionLimits {
  readonly maxSkillsInContext: number;
  readonly maxToolsActive: number;
  readonly maxWorkingTokens: number;
  readonly maxEpisodesInContext: number;
}

export interface ApplyAttentionLimitsRequest {
  readonly worldResults: readonly LocalWorldSearchResult[];
  readonly tools: readonly string[];
  readonly episodes: readonly Episode[];
  readonly limits?: AttentionLimits;
}

export interface AttentionSelection {
  readonly skills: readonly LocalWorldSearchResult[];
  readonly traces: readonly LocalWorldSearchResult[];
  readonly antiPatterns: readonly LocalWorldSearchResult[];
  readonly tools: readonly string[];
  readonly episodes: readonly Episode[];
}

export function applyAttentionLimits({
  worldResults,
  tools,
  episodes,
  limits = defaultAttentionLimits,
}: ApplyAttentionLimitsRequest): AttentionSelection {
  return {
    skills: worldResults.filter((result) => result.kind === "skill").slice(0, limits.maxSkillsInContext),
    traces: worldResults.filter((result) => result.kind === "trace").slice(0, limits.maxSkillsInContext),
    antiPatterns: worldResults.filter((result) => result.kind === "anti-pattern"),
    tools: tools.slice(0, limits.maxToolsActive),
    episodes: episodes.slice(Math.max(0, episodes.length - limits.maxEpisodesInContext)),
  };
}
