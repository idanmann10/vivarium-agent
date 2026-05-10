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

export interface CompoundingBenchmarkObservation {
  readonly proceduralHits: number;
  readonly validationScore: number;
}

export interface CompoundingBenchmarkCase {
  readonly id: string;
  readonly domain: string;
  readonly before: CompoundingBenchmarkObservation;
  readonly after: CompoundingBenchmarkObservation;
}

export interface CompoundingCaseResult extends CompoundingBenchmarkCase, CompoundingImprovementResult {}

export interface CompoundingEvaluationInput {
  readonly benchmarkName?: string;
  readonly cases: readonly CompoundingBenchmarkCase[];
}

export interface CompoundingEvaluationResult extends CompoundingImprovementResult {
  readonly benchmarkName: string;
  readonly cases: readonly CompoundingCaseResult[];
  readonly beforeProceduralHits: number;
  readonly afterProceduralHits: number;
  readonly beforeValidationScore: number;
  readonly afterValidationScore: number;
}

export function scoreCompoundingImprovement(input: CompoundingImprovementInput): CompoundingImprovementResult {
  const delta =
    input.afterProceduralHits -
    input.beforeProceduralHits +
    (input.afterValidationScore - input.beforeValidationScore);

  return { improved: delta > 0, delta };
}

export function runCompoundingEvaluation(input: CompoundingEvaluationInput): CompoundingEvaluationResult {
  if (input.cases.length === 0) {
    throw new Error("compounding benchmark requires at least one case");
  }

  const cases = input.cases.map((benchmarkCase) => ({
    ...benchmarkCase,
    ...scoreCompoundingImprovement({
      beforeProceduralHits: benchmarkCase.before.proceduralHits,
      afterProceduralHits: benchmarkCase.after.proceduralHits,
      beforeValidationScore: benchmarkCase.before.validationScore,
      afterValidationScore: benchmarkCase.after.validationScore,
    }),
  }));
  const beforeProceduralHits = sum(input.cases.map((benchmarkCase) => benchmarkCase.before.proceduralHits));
  const afterProceduralHits = sum(input.cases.map((benchmarkCase) => benchmarkCase.after.proceduralHits));
  const beforeValidationScore = average(input.cases.map((benchmarkCase) => benchmarkCase.before.validationScore));
  const afterValidationScore = average(input.cases.map((benchmarkCase) => benchmarkCase.after.validationScore));
  const aggregate = scoreCompoundingImprovement({
    beforeProceduralHits,
    afterProceduralHits,
    beforeValidationScore,
    afterValidationScore,
  });

  return {
    benchmarkName: input.benchmarkName ?? compoundingEvalName,
    cases,
    beforeProceduralHits,
    afterProceduralHits,
    beforeValidationScore,
    afterValidationScore,
    ...aggregate,
  };
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function average(values: readonly number[]): number {
  return sum(values) / values.length;
}
