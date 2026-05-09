import { skillId, traceId, type SkillId, type TraceId } from "../../../../core/src/index.js";
import type { LocalProvider } from "../../../../providers/src/index.js";
import type { LocalWorldSearchResult } from "../../../../world/src/index.js";

export interface PlanPrimitiveContext {
  readonly skills: readonly LocalWorldSearchResult[];
  readonly traces: readonly LocalWorldSearchResult[];
  readonly antiPatterns: readonly LocalWorldSearchResult[];
}

export interface PlanPrimitiveRequest {
  readonly goal: string;
  readonly provider: LocalProvider;
  readonly context: PlanPrimitiveContext;
}

export interface PlanPrimitivePayload {
  readonly plan: string;
  readonly skillsLoaded: readonly SkillId[];
  readonly tracesLoaded: readonly TraceId[];
}

export async function runPlanPrimitive(request: PlanPrimitiveRequest): Promise<PlanPrimitivePayload> {
  const plan = await request.provider.complete({ kind: "plan", input: request.goal });
  const contextTitles = [...request.context.skills, ...request.context.traces, ...request.context.antiPatterns].map(
    (result) => result.title,
  );
  return {
    plan: `${plan}\nLoaded: ${contextTitles.join(", ")}`,
    skillsLoaded: request.context.skills.map((result) => skillId(result.id)),
    tracesLoaded: request.context.traces.map((result) => traceId(result.id)),
  };
}
