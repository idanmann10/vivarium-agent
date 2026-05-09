import type { DevStage } from "../types/agent.js";

export interface DevelopmentScoreInput {
  readonly runsCompleted: number;
  readonly successRate: number;
  readonly skillDiversity: number;
}

export function developmentScore({ runsCompleted, successRate, skillDiversity }: DevelopmentScoreInput): number {
  if (runsCompleted < 0 || successRate < 0 || successRate > 1 || skillDiversity < 0) {
    throw new Error("developmentScore expects non-negative counts and successRate in [0, 1]");
  }

  return runsCompleted * successRate * skillDiversity;
}

export function stageForScore(score: number): DevStage {
  if (score < 5) {
    return "newborn";
  }

  if (score < 25) {
    return "apprentice";
  }

  if (score < 100) {
    return "journeyman";
  }

  if (score < 400) {
    return "senior";
  }

  return "master";
}
