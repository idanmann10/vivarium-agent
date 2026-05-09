import type { ContributorId, SkillId, WorldRef } from "../ids.js";
import type { CredentialRequirement } from "./credential.js";

export type SkillStatus = "candidate" | "promoted" | "deprecated" | "archived";
export type SkillKind = "prompt" | "code";
export type Visibility = "public" | "private" | "internal";

export interface Skill {
  readonly id: SkillId;
  readonly name: string;
  readonly description: string;
  readonly kind: SkillKind;
  readonly body: string;
  readonly domains: readonly string[];
  readonly status: SkillStatus;
  readonly visibility: Visibility;
  readonly version: number;
  readonly parentSkillId: SkillId | null;
  readonly competesWith: readonly SkillId[];
  readonly inspiredBy: readonly string[];
  readonly worldRef: WorldRef | null;
  readonly contributorId: ContributorId | null;
  readonly requiredCredentials: readonly CredentialRequirement[];
  readonly requiredToolsets: readonly string[];
  readonly createdAt: string;
  readonly lastUsedAt: string | null;
  readonly lastValidatedAt: string | null;
  readonly timesUsed: number;
  readonly timesHelped: number;
  readonly habitual: boolean;
}

export interface SkillCandidateProposal {
  readonly name: string;
  readonly description: string;
  readonly body: string;
  readonly evidenceRunIds: readonly string[];
}

export interface SkillRefinement {
  readonly skillId: SkillId;
  readonly proposedBody: string;
  readonly reason: string;
}
