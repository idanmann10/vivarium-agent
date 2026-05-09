export const compoundingEvalName = "dream-compounding";

export interface CompoundingImprovementInput {
  readonly beforeProceduralHits: number;
  readonly afterProceduralHits: number;
  readonly beforeValidationScore: number;
  readonly afterValidationScore: number;
}

export interface CompoundingImprovementResult {
  readonly improved: boolean;
  readonly delta: number;
}

export function scoreCompoundingImprovement(input: CompoundingImprovementInput): CompoundingImprovementResult {
  const delta =
    input.afterProceduralHits -
    input.beforeProceduralHits +
    (input.afterValidationScore - input.beforeValidationScore);

  return { improved: delta > 0, delta };
}
