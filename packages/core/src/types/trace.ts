import type { ContributorId, RunId, SkillId, TraceId } from "../ids.js";
import type { Visibility } from "./skill.js";

export interface TraceStep {
  readonly index: number;
  readonly action: string;
  readonly observation?: string;
  readonly annotation?: string;
  readonly reflection?: string;
}

export interface Trace {
  readonly id: TraceId;
  readonly title: string;
  readonly description: string;
  readonly domain: string;
  readonly prerequisites: readonly SkillId[];
  readonly teaches: readonly string[];
  readonly visibility: Visibility;
  readonly steps: readonly TraceStep[];
  readonly pitfalls: readonly string[];
  readonly alternatives: readonly string[];
  readonly extractedFrom?: RunId;
  readonly contributorId: ContributorId;
  readonly createdAt: string;
}

export interface TraceCandidateProposal {
  readonly title: string;
  readonly domain: string;
  readonly sourceRunId: RunId;
  readonly teaches: readonly string[];
}
