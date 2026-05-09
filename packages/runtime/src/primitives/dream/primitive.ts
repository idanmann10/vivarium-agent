import {
  shouldHabituate,
  shouldPromoteCandidate,
  shouldPruneLocalSkill,
  stageForScore,
} from "../../../../core/src/index.js";
import type { DevStage } from "../../../../core/src/index.js";
import type { InMemoryStateRepository } from "../../../../state/src/index.js";
import type { LocalSkillRecord } from "../../../../state/src/index.js";
import { wilsonLowerBound } from "../../../../core/src/index.js";

export interface DreamDomainStats {
  readonly runsCompleted: number;
  readonly successRate: number;
  readonly skillDiversity: number;
}

export interface DreamRequest {
  readonly state: InMemoryStateRepository;
  readonly domainStats: Readonly<Record<string, DreamDomainStats>>;
}

export interface DreamResult {
  readonly promoted: readonly string[];
  readonly pruned: readonly string[];
  readonly habitual: readonly string[];
  readonly identitySummary: string;
  readonly devStages: Readonly<Record<string, DevStage>>;
  readonly confidenceNotes: readonly string[];
}

function lowerBound(skill: LocalSkillRecord): number {
  return wilsonLowerBound({ helped: skill.helped, uses: skill.uses });
}

function confidenceNotes(state: InMemoryStateRepository): readonly string[] {
  return state.listConfidenceBuckets().map((bucket) => {
    const rate = bucket.correct / bucket.total;
    return rate < 0.5
      ? `Confidence bucket ${bucket.bucket} is overconfident (${bucket.correct}/${bucket.total} correct).`
      : `Confidence bucket ${bucket.bucket} is calibrated enough (${bucket.correct}/${bucket.total} correct).`;
  });
}

export function runDream({ state, domainStats }: DreamRequest): DreamResult {
  const promoted: string[] = [];
  const pruned: string[] = [];
  const habitual: string[] = [];
  const skills = state.listLocalSkills();
  const rankedByUse = [...skills].sort((left, right) => right.uses - left.uses);

  for (const skill of skills) {
    const lb = lowerBound(skill);
    const rankByUse = rankedByUse.findIndex((candidate) => candidate.id === skill.id) + 1;

    if (skill.status === "candidate" && shouldPromoteCandidate({ lowerBound: lb, uses: skill.uses })) {
      state.upsertLocalSkill({ ...skill, status: "promoted" });
      promoted.push(String(skill.id));
      continue;
    }

    if (shouldPruneLocalSkill({ lowerBound: lb, runsSinceLastUse: skill.lastUsedRunOffset })) {
      state.upsertLocalSkill({ ...skill, status: "archived", habitual: false });
      pruned.push(String(skill.id));
      continue;
    }

    if (shouldHabituate({ uses: skill.uses, lowerBound: lb, rankByUse })) {
      state.upsertLocalSkill({ ...skill, habitual: true });
      habitual.push(String(skill.id));
    }
  }

  const identity = state.getIdentity();
  const devStages = Object.fromEntries(
    Object.entries(domainStats).map(([domain, stats]) => [
      domain,
      stageForScore(stats.runsCompleted * stats.successRate * stats.skillDiversity),
    ]),
  ) as Readonly<Record<string, DevStage>>;
  const identitySummary = `Dream consolidated ${skills.length} local skills across ${Object.keys(domainStats).join(", ")}.`;

  if (identity !== undefined) {
    state.setIdentity({
      ...identity,
      devStages,
      runsCompleted: Object.values(domainStats).reduce((sum, stats) => sum + stats.runsCompleted, 0),
      summary: identitySummary,
      updatedAt: new Date().toISOString(),
    });
  }

  return {
    promoted,
    pruned,
    habitual,
    identitySummary,
    devStages,
    confidenceNotes: confidenceNotes(state),
  };
}
