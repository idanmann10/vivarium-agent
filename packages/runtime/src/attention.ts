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
  readonly runs: readonly LocalWorldSearchResult[];
  readonly tools: readonly string[];
  readonly episodes: readonly Episode[];
  readonly tokenBudget: AttentionTokenBudget;
}

export interface AttentionTokenBudget {
  readonly estimatedTokens: number;
  readonly maxWorkingTokens: number;
  readonly remainingTokens: number;
  readonly truncated: boolean;
}

function estimateTokens(value: unknown): number {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return Math.max(1, Math.ceil(text.length / 20));
}

function takeWithinBudget<T>(
  items: readonly T[],
  budget: { estimatedTokens: number; truncated: boolean },
  maxWorkingTokens: number,
): readonly T[] {
  const selected: T[] = [];

  for (const item of items) {
    const itemTokens = estimateTokens(item);
    if (budget.estimatedTokens + itemTokens > maxWorkingTokens) {
      budget.truncated = true;
      continue;
    }

    budget.estimatedTokens += itemTokens;
    selected.push(item);
  }

  return selected;
}

export function applyAttentionLimits({
  worldResults,
  tools,
  episodes,
  limits = defaultAttentionLimits,
}: ApplyAttentionLimitsRequest): AttentionSelection {
  const budget = { estimatedTokens: 0, truncated: false };
  const skills = takeWithinBudget(
    worldResults.filter((result) => result.kind === "skill").slice(0, limits.maxSkillsInContext),
    budget,
    limits.maxWorkingTokens,
  );
  const traces = takeWithinBudget(
    worldResults.filter((result) => result.kind === "trace").slice(0, limits.maxSkillsInContext),
    budget,
    limits.maxWorkingTokens,
  );
  const antiPatterns = takeWithinBudget(
    worldResults.filter((result) => result.kind === "anti-pattern"),
    budget,
    limits.maxWorkingTokens,
  );
  const runs = takeWithinBudget(
    worldResults.filter((result) => result.kind === "run").slice(0, limits.maxSkillsInContext),
    budget,
    limits.maxWorkingTokens,
  );
  const selectedTools = takeWithinBudget(tools.slice(0, limits.maxToolsActive), budget, limits.maxWorkingTokens);
  const selectedEpisodes = takeWithinBudget(
    episodes.slice(Math.max(0, episodes.length - limits.maxEpisodesInContext)),
    budget,
    limits.maxWorkingTokens,
  );

  return {
    skills,
    traces,
    antiPatterns,
    runs,
    tools: selectedTools,
    episodes: selectedEpisodes,
    tokenBudget: {
      estimatedTokens: budget.estimatedTokens,
      maxWorkingTokens: limits.maxWorkingTokens,
      remainingTokens: Math.max(0, limits.maxWorkingTokens - budget.estimatedTokens),
      truncated: budget.truncated,
    },
  };
}
