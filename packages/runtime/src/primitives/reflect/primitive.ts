import type { Reflection } from "../../../../core/src/index.js";

export interface ReflectPrimitiveRequest {
  readonly validationScore: number;
  readonly surprises?: readonly string[];
}

export interface ReflectPrimitivePayload {
  readonly reflection: Reflection;
}

export function runReflectPrimitive(request: ReflectPrimitiveRequest): ReflectPrimitivePayload {
  const surprises = request.surprises ?? [];
  return {
    reflection: {
      worked: ["local deterministic runtime completed"],
      didntWork: [],
      surprises,
      skillCandidates: [],
      skillRefinements: [],
      skillPrunings: [],
      antiPatternCandidates: [],
      scaffoldingGaps: [],
      publishable: request.validationScore > 0.7 && surprises.length > 0,
    },
  };
}
