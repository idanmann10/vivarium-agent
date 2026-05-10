import {
  shouldHabituate,
  shouldPromoteCandidate,
  shouldPruneLocalSkill,
  stageForScore,
} from "../../../../core/src/index.js";
import type { DevStage, Episode, Run, TraceStep } from "../../../../core/src/index.js";
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
  readonly antiPatternCandidates: readonly string[];
  readonly traceCandidates: readonly string[];
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

function stringify(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function monitorReasons(episodes: readonly Episode[]): readonly string[] {
  return episodes
    .filter((episode) => episode.kind === "monitor_signal")
    .flatMap((episode) => episode.reasons);
}

function generateAntiPatternCandidate(state: InMemoryStateRepository, run: Run, episodes: readonly Episode[]): string {
  const id = `anti-pattern-${String(run.id)}`;
  const reasons = monitorReasons(episodes);
  state.upsertAntiPatternCandidate({
    id,
    domain: run.domain,
    name: `Avoid repeating ${run.domain} failure`,
    description: `Run ${String(run.id)} failed while trying to ${run.goal}.`,
    why: reasons.length > 0 ? reasons.join("; ") : run.notes || "The run ended unsuccessfully.",
    insteadDo: "Review monitor signals, narrow the scope, and retry only with new evidence.",
    evidenceRunIds: [String(run.id)],
    createdAt: new Date().toISOString(),
  });
  return id;
}

function traceStepsFromEpisodes(episodes: readonly Episode[]): readonly TraceStep[] {
  const steps: TraceStep[] = [];
  for (const episode of episodes) {
    if (episode.kind === "run_start") {
      steps.push({
        index: steps.length + 1,
        action: `Start ${episode.domain ?? "local"} run`,
        observation: episode.goal,
        annotation: "Run goal captured before planning.",
      });
    }

    if (episode.kind === "action") {
      steps.push({
        index: steps.length + 1,
        action: `Use ${episode.tool}`,
        observation: stringify(episode.args),
        annotation: "Action recorded during a successful run.",
      });
    }

    if (episode.kind === "observation") {
      steps.push({
        index: steps.length + 1,
        action: "Observe result",
        observation: stringify(episode.content),
        annotation: "Observation retained as trace evidence.",
      });
    }

    if (episode.kind === "validation") {
      steps.push({
        index: steps.length + 1,
        action: "Validate outcome",
        observation: episode.reasons.join("; "),
        annotation: `Validation ${episode.passed ? "passed" : "failed"} with score ${episode.score}.`,
      });
    }
  }

  return steps;
}

function generateTraceCandidate(state: InMemoryStateRepository, run: Run, episodes: readonly Episode[]): string {
  const id = `trace-${String(run.id)}`;
  state.upsertTraceCandidate({
    id,
    domain: run.domain,
    title: `Trace for ${run.goal}`,
    sourceRunId: run.id,
    teaches: [run.domain, run.goal],
    steps: traceStepsFromEpisodes(episodes),
    createdAt: new Date().toISOString(),
  });
  return id;
}

export function runDream({ state, domainStats }: DreamRequest): DreamResult {
  const promoted: string[] = [];
  const pruned: string[] = [];
  const habitual: string[] = [];
  const antiPatternCandidates: string[] = [];
  const traceCandidates: string[] = [];
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

  for (const run of state.listRuns()) {
    const episodes = state.listEpisodes(run.id);
    if (run.success === false || (run.score !== null && run.score < 0.5)) {
      antiPatternCandidates.push(generateAntiPatternCandidate(state, run, episodes));
      continue;
    }

    if (run.success === true && (run.score ?? 0) >= 0.7) {
      traceCandidates.push(generateTraceCandidate(state, run, episodes));
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
    antiPatternCandidates,
    traceCandidates,
  };
}
