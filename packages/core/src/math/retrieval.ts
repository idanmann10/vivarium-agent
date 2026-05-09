export interface RetrievalWeights {
  readonly alpha: number;
  readonly beta: number;
  readonly gamma: number;
  readonly delta: number;
}

export const DEFAULT_RETRIEVAL_WEIGHTS = {
  alpha: 0.45,
  beta: 0.35,
  gamma: 0.1,
  delta: 0.1,
} as const satisfies RetrievalWeights;

export interface RetrievalScoreInput {
  readonly similarity: number;
  readonly effectiveLowerBound: number;
  readonly recency: number;
  readonly domainMatch: number;
  readonly weights?: RetrievalWeights;
}

export function retrievalScore(input: RetrievalScoreInput): number {
  const weights = input.weights ?? DEFAULT_RETRIEVAL_WEIGHTS;

  return (
    weights.alpha * input.similarity +
    weights.beta * input.effectiveLowerBound +
    weights.gamma * input.recency +
    weights.delta * input.domainMatch
  );
}

export interface RecencyInput {
  readonly ageDays: number;
  readonly tauDays?: number;
}

export function recencyScore({ ageDays, tauDays = 30 }: RecencyInput): number {
  if (ageDays < 0 || tauDays <= 0) {
    throw new Error("recencyScore expects ageDays >= 0 and tauDays > 0");
  }

  return Math.exp(-ageDays / tauDays);
}
