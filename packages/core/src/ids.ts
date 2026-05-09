declare const __brand: unique symbol;

export type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type AgentId = Brand<string, "AgentId">;
export type RunId = Brand<string, "RunId">;
export type EpisodeId = Brand<string, "EpisodeId">;
export type SkillId = Brand<string, "SkillId">;
export type TraceId = Brand<string, "TraceId">;
export type AntiPatternId = Brand<string, "AntiPatternId">;
export type ContributorId = Brand<string, "ContributorId">;
export type WorldRef = Brand<string, "WorldRef">;

function brandedId<T extends string, B extends string>(value: T, label: B): Brand<T, B> {
  if (value.trim().length === 0) {
    throw new Error(`${label} cannot be blank`);
  }

  return value as Brand<T, B>;
}

export function agentId<T extends string>(value: T): Brand<T, "AgentId"> {
  return brandedId(value, "AgentId");
}

export function runId<T extends string>(value: T): Brand<T, "RunId"> {
  return brandedId(value, "RunId");
}

export function episodeId<T extends string>(value: T): Brand<T, "EpisodeId"> {
  return brandedId(value, "EpisodeId");
}

export function skillId<T extends string>(value: T): Brand<T, "SkillId"> {
  return brandedId(value, "SkillId");
}

export function traceId<T extends string>(value: T): Brand<T, "TraceId"> {
  return brandedId(value, "TraceId");
}

export function antiPatternId<T extends string>(value: T): Brand<T, "AntiPatternId"> {
  return brandedId(value, "AntiPatternId");
}

export function contributorId<T extends string>(value: T): Brand<T, "ContributorId"> {
  return brandedId(value, "ContributorId");
}

export function worldRef<T extends string>(value: T): Brand<T, "WorldRef"> {
  return brandedId(value, "WorldRef");
}
