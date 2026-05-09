import type { RunId } from "../../core/src/ids.js";
import type { CurriculumProgress, Episode, Run } from "../../core/src/index.js";

export interface ConfidenceBucket {
  readonly bucket: string;
  readonly correct: number;
  readonly total: number;
}

export interface PredictionOutcome {
  readonly confidence: number;
  readonly correct: boolean;
}

export class InMemoryStateRepository {
  readonly #runs = new Map<RunId, Run>();
  readonly #episodes = new Map<RunId, Episode[]>();
  readonly #confidence = new Map<string, { correct: number; total: number }>();
  readonly #curriculum = new Map<string, CurriculumProgress>();

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
}
