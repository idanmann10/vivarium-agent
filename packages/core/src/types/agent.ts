import type { AgentId, WorldRef } from "../ids.js";

export type DevStage = "newborn" | "apprentice" | "journeyman" | "senior" | "master";
export type Capability = "chat" | "tools" | "json_mode" | "vision" | "embedding";
export type CostClass = "cheap" | "medium" | "expensive";

export interface Identity {
  readonly agentId: AgentId;
  readonly name: string;
  readonly devStages: Readonly<Record<string, DevStage>>;
  readonly runsCompleted: number;
  readonly summary: string;
  readonly updatedAt: string;
}

export interface AgentConfig {
  readonly id: AgentId;
  readonly name: string;
  readonly worlds: readonly WorldSubscription[];
  readonly providers: ProvidersConfig;
  readonly attention: AttentionConfig;
  readonly habituation: HabituationConfig;
  readonly safety: SafetyConfig;
}

export interface WorldSubscription {
  readonly ref: WorldRef;
  readonly priority: number;
  readonly autoPushEnabled: boolean;
}

export interface ProvidersConfig {
  readonly executor: ProviderRef;
  readonly validator: ProviderRef;
  readonly fallbacks: readonly ProviderRef[];
}

export interface ProviderRef {
  readonly kind: "anthropic" | "openai" | "openai-compat";
  readonly model: string;
  readonly baseUrl?: string;
  readonly apiKeyEnvVar: string;
  readonly capabilities: readonly Capability[];
  readonly contextWindow: number;
  readonly costClass: CostClass;
}

export interface AttentionConfig {
  readonly maxSkillsInContext: number;
  readonly maxToolsActive: number;
  readonly maxWorkingTokens: number;
  readonly maxEpisodesInContext: number;
}

export interface AttentionUsage {
  readonly skillsInContext: number;
  readonly toolsActive: number;
  readonly workingTokens: number;
  readonly episodesInContext: number;
}

export interface HabituationConfig {
  readonly enabled: boolean;
  readonly maxHabitual: number;
  readonly minUses: number;
  readonly minLb: number;
}

export interface SafetyConfig {
  readonly httpAllowlist: readonly string[];
  readonly httpRateLimit: { readonly perRun: number; readonly perDay: number };
  readonly destructiveEndpointsRequireConfirmation: boolean;
  readonly computerUseConfirmationLevel: "always" | "system_only" | "never";
}
