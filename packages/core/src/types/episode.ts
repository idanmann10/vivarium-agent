import type { AgentId, EpisodeId, RunId, SkillId, TraceId } from "../ids.js";
import type { AntiPatternCandidateProposal } from "./anti-pattern.js";
import type { SkillCandidateProposal, SkillRefinement } from "./skill.js";
import type { TraceCandidateProposal } from "./trace.js";

export interface Prediction {
  readonly about: string;
  readonly expected: string;
  readonly confidence: number;
}

export interface BaseEpisode {
  readonly id: EpisodeId;
  readonly runId: RunId;
  readonly agentId: AgentId;
  readonly timestamp: string;
  readonly tags: readonly string[];
}

export type Episode =
  | (BaseEpisode & { readonly kind: "run_start"; readonly goal: string; readonly domain?: string })
  | (BaseEpisode & {
      readonly kind: "plan";
      readonly plan: string;
      readonly skillsLoaded: readonly SkillId[];
      readonly tracesLoaded: readonly TraceId[];
    })
  | (BaseEpisode & { readonly kind: "prediction"; readonly prediction: Prediction })
  | (BaseEpisode & { readonly kind: "action"; readonly tool: string; readonly args: unknown })
  | (BaseEpisode & { readonly kind: "observation"; readonly content: unknown })
  | (BaseEpisode & {
      readonly kind: "surprise";
      readonly prediction: Prediction;
      readonly actual: string;
      readonly magnitude: number;
      readonly notes?: string;
    })
  | (BaseEpisode & { readonly kind: "monitor_signal"; readonly offTrackScore: number; readonly reasons: readonly string[] })
  | (BaseEpisode & {
      readonly kind: "recovery";
      readonly decision: "replan" | "narrow" | "escalate" | "abort";
      readonly reason: string;
    })
  | (BaseEpisode & { readonly kind: "validation"; readonly score: number; readonly passed: boolean; readonly reasons: readonly string[] })
  | (BaseEpisode & { readonly kind: "skill_used"; readonly skillId: SkillId; readonly helped: boolean })
  | (BaseEpisode & { readonly kind: "reflection"; readonly reflection: Reflection })
  | (BaseEpisode & {
      readonly kind: "refusal";
      readonly reason: string;
      readonly category: "harmful" | "unauthorized" | "out_of_scope" | "destructive";
    })
  | (BaseEpisode & { readonly kind: "run_end"; readonly success: boolean | null; readonly score?: number });

export interface Reflection {
  readonly worked: readonly string[];
  readonly didntWork: readonly string[];
  readonly surprises: readonly string[];
  readonly skillCandidates: readonly SkillCandidateProposal[];
  readonly skillRefinements: readonly SkillRefinement[];
  readonly skillPrunings: readonly string[];
  readonly antiPatternCandidates: readonly AntiPatternCandidateProposal[];
  readonly traceCandidate?: TraceCandidateProposal;
  readonly scaffoldingGaps: readonly string[];
  readonly publishable: boolean;
}
