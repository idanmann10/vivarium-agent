import type { Reflection } from "../../../../core/src/index.js";

export interface ReflectPrimitiveRequest {
  readonly validationScore: number;
  readonly surprises?: readonly string[];
  readonly goal?: string;
  readonly evidenceRunId?: string;
}

export interface ReflectPrimitivePayload {
  readonly reflection: Reflection;
}

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function runReflectPrimitive(request: ReflectPrimitiveRequest): ReflectPrimitivePayload {
  const surprises = request.surprises ?? [];
  const firstReusableSurprise = request.validationScore > 0.7 ? surprises[0] : undefined;
  return {
    reflection: {
      worked: ["local deterministic runtime completed"],
      didntWork: [],
      surprises,
      skillCandidates:
        firstReusableSurprise === undefined
          ? []
          : [
              {
                name: `Reuse ${titleCase(firstReusableSurprise)}`,
                description: "Capture reusable learning from a surprising successful run.",
                body: `When a run succeeds and surfaces "${firstReusableSurprise}", extract the reusable step before starting a similar goal. Original goal: ${
                  request.goal ?? "local goal"
                }.`,
                evidenceRunIds: request.evidenceRunId === undefined ? [] : [request.evidenceRunId],
              },
            ],
      skillRefinements: [],
      skillPrunings: [],
      antiPatternCandidates: [],
      scaffoldingGaps: [],
      publishable: request.validationScore > 0.7 && surprises.length > 0,
    },
  };
}
