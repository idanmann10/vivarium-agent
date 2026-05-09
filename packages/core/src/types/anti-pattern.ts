import type { AntiPatternId, ContributorId, SkillId } from "../ids.js";
import type { Visibility } from "./skill.js";

export interface AntiPattern {
  readonly id: AntiPatternId;
  readonly name: string;
  readonly description: string;
  readonly why: string;
  readonly insteadDo: string;
  readonly domain: string;
  readonly visibility: Visibility;
  readonly relatedSkills: readonly SkillId[];
  readonly contributorId: ContributorId;
  readonly createdAt: string;
}

export interface AntiPatternCandidateProposal {
  readonly name: string;
  readonly description: string;
  readonly why: string;
  readonly insteadDo: string;
  readonly evidenceRunIds: readonly string[];
}
