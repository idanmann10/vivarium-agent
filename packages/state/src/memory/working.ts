import type { WorkingMemory } from "../../../core/src/index.js";

export interface WorkingMemoryBudget {
  readonly maxWorkingTokens: number;
  readonly maxEpisodesInContext: number;
}

export function applyWorkingMemoryBudget(memory: WorkingMemory, budget: WorkingMemoryBudget): WorkingMemory {
  if (memory.tokenEstimate > budget.maxWorkingTokens) {
    throw new Error("working memory token estimate exceeds maxWorkingTokens");
  }

  return {
    ...memory,
    episodes: memory.episodes.slice(-budget.maxEpisodesInContext),
  };
}
