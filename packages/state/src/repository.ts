import type { RunId, SkillId } from "../../core/src/ids.js";
import type { CurriculumProgress, DevStage, Episode, Identity, Run } from "../../core/src/index.js";

export interface ConfidenceBucket {
  readonly bucket: string;
  readonly correct: number;
  readonly total: number;
}

export interface PredictionOutcome {
  readonly confidence: number;
  readonly correct: boolean;
}

export type LocalSkillStatus = "candidate" | "promoted" | "deprecated" | "archived";

export interface LocalSkillRecord {
  readonly id: SkillId;
  readonly name: string;
  readonly domain: string;
  readonly status: LocalSkillStatus;
  readonly uses: number;
  readonly helped: number;
  readonly lastUsedRunOffset: number;
  readonly habitual: boolean;
  readonly body: string;
}

export interface PublishableArtifact {
  readonly kind: "run" | "trace" | "skill" | "anti-pattern";
  readonly path: string;
  readonly body: string;
}

export interface DomainStats {
  readonly runsCompleted: number;
  readonly successRate: number;
  readonly skillDiversity: number;
  readonly stage: DevStage;
}

export class InMemoryStateRepository {
  readonly #runs = new Map<RunId, Run>();
  readonly #episodes = new Map<RunId, Episode[]>();
  readonly #confidence = new Map<string, { correct: number; total: number }>();
  readonly #curriculum = new Map<string, CurriculumProgress>();
  readonly #skills = new Map<SkillId, LocalSkillRecord>();
  readonly #publishable: PublishableArtifact[] = [];
  #identity: Identity | undefined;

  createRun(run: Run): void {
    this.#runs.set(run.id, run);
    this.#episodes.set(run.id, []);
  }

  updateRun(run: Run): void {
    if (!this.#runs.has(run.id)) {
      throw new Error(`Run not found: ${String(run.id)}`);
    }

    this.#runs.set(run.id, run);
  }

  getRun(id: RunId): Run | undefined {
    return this.#runs.get(id);
  }

  listRuns(): readonly Run[] {
    return [...this.#runs.values()];
  }

  appendEpisode(episode: Episode): void {
    const existing = this.#episodes.get(episode.runId) ?? [];
    existing.push(episode);
    this.#episodes.set(episode.runId, existing);
  }

  listEpisodes(runId: RunId): readonly Episode[] {
    return this.#episodes.get(runId) ?? [];
  }

  recordPredictionOutcome({ confidence, correct }: PredictionOutcome): void {
    if (confidence < 0 || confidence > 1) {
      throw new Error("confidence must be in [0, 1]");
    }

    const lower = Math.min(9, Math.floor(confidence * 10));
    const bucket = `0.${lower}-0.${lower + 1}`;
    const current = this.#confidence.get(bucket) ?? { correct: 0, total: 0 };
    this.#confidence.set(bucket, {
      correct: current.correct + (correct ? 1 : 0),
      total: current.total + 1,
    });
  }

  listConfidenceBuckets(): readonly ConfidenceBucket[] {
    return [...this.#confidence.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([bucket, value]) => ({ bucket, correct: value.correct, total: value.total }));
  }

  advanceCurriculum(domain: string, stepIndex: number): void {
    const current =
      this.#curriculum.get(domain) ??
      ({
        domain,
        currentStepIndex: stepIndex,
        completedSteps: [],
        startedAt: "local",
      } satisfies CurriculumProgress);
    const completed = current.completedSteps.includes(stepIndex)
      ? current.completedSteps
      : [...current.completedSteps, stepIndex].sort((left, right) => left - right);

    this.#curriculum.set(domain, {
      ...current,
      currentStepIndex: Math.max(current.currentStepIndex, stepIndex),
      completedSteps: completed,
    });
  }

  getCurriculumProgress(domain: string): CurriculumProgress | undefined {
    return this.#curriculum.get(domain);
  }

  upsertLocalSkill(skill: LocalSkillRecord): void {
    this.#skills.set(skill.id, skill);
  }

  listLocalSkills(): readonly LocalSkillRecord[] {
    return [...this.#skills.values()];
  }

  setIdentity(identity: Identity): void {
    this.#identity = identity;
  }

  getIdentity(): Identity | undefined {
    return this.#identity;
  }

  queuePublishableArtifact(artifact: PublishableArtifact): void {
    this.#publishable.push(artifact);
  }

  listPublishableArtifacts(): readonly PublishableArtifact[] {
    return [...this.#publishable];
  }
}
