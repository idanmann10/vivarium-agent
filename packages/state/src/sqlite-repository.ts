import { Database } from "bun:sqlite";

import type { RunId } from "../../core/src/ids.js";
import type { CurriculumProgress, Episode, Identity, Run } from "../../core/src/index.js";
import type {
  AntiPatternCandidateRecord,
  ConfidenceBucket,
  LocalSkillRecord,
  PredictionOutcome,
  PublishableArtifact,
  SemanticFactRecord,
  TraceCandidateRecord,
} from "./repository.js";
import { runMigrations } from "./storage/migrations.js";

interface JsonRow {
  readonly json: string;
}

interface ConfidenceRow {
  readonly bucket: string;
  readonly correct: number;
  readonly total: number;
}

interface CandidateRow {
  readonly json: string;
}

export class SQLiteStateRepository {
  readonly #db: Database;

  constructor(path: string) {
    this.#db = new Database(path, { create: true });
    this.#db.run("PRAGMA journal_mode = WAL");
    runMigrations(this.#db);
  }

  close(): void {
    this.#db.close();
  }

  createRun(run: Run): void {
    this.#db.query("INSERT OR REPLACE INTO runs (id, json) VALUES (?, ?)").run(String(run.id), JSON.stringify(run));
  }

  updateRun(run: Run): void {
    const existing = this.getRun(run.id);
    if (existing === undefined) {
      throw new Error(`Run not found: ${String(run.id)}`);
    }

    this.#db.query("UPDATE runs SET json = ? WHERE id = ?").run(JSON.stringify(run), String(run.id));
  }

  getRun(id: RunId): Run | undefined {
    const row = this.#db.query("SELECT json FROM runs WHERE id = ?").get(String(id)) as JsonRow | null;
    return row === null ? undefined : (JSON.parse(row.json) as Run);
  }

  listRuns(): readonly Run[] {
    const rows = this.#db.query("SELECT json FROM runs ORDER BY id").all() as JsonRow[];
    return rows.map((row) => JSON.parse(row.json) as Run);
  }

  appendEpisode(episode: Episode): void {
    this.#db
      .query("INSERT INTO episodes (id, run_id, json) VALUES (?, ?, ?)")
      .run(String(episode.id), String(episode.runId), JSON.stringify(episode));
  }

  listEpisodes(runId: RunId): readonly Episode[] {
    const rows = this.#db
      .query("SELECT json FROM episodes WHERE run_id = ? ORDER BY sequence")
      .all(String(runId)) as JsonRow[];
    return rows.map((row) => JSON.parse(row.json) as Episode);
  }

  recordPredictionOutcome({ confidence, correct }: PredictionOutcome): void {
    if (confidence < 0 || confidence > 1) {
      throw new Error("confidence must be in [0, 1]");
    }

    const lower = Math.min(9, Math.floor(confidence * 10));
    const bucket = `0.${lower}-0.${lower + 1}`;
    const current = this.#db
      .query("SELECT bucket, correct, total FROM confidence_buckets WHERE bucket = ?")
      .get(bucket) as ConfidenceRow | null;
    const next = {
      correct: (current?.correct ?? 0) + (correct ? 1 : 0),
      total: (current?.total ?? 0) + 1,
    };

    this.#db
      .query("INSERT OR REPLACE INTO confidence_buckets (bucket, correct, total) VALUES (?, ?, ?)")
      .run(bucket, next.correct, next.total);
  }

  listConfidenceBuckets(): readonly ConfidenceBucket[] {
    const rows = this.#db
      .query("SELECT bucket, correct, total FROM confidence_buckets ORDER BY bucket")
      .all() as ConfidenceRow[];
    return rows.map((row) => ({ bucket: row.bucket, correct: row.correct, total: row.total }));
  }

  advanceCurriculum(domain: string, stepIndex: number): void {
    const current =
      this.getCurriculumProgress(domain) ??
      ({
        domain,
        currentStepIndex: stepIndex,
        completedSteps: [],
        startedAt: "local",
      } satisfies CurriculumProgress);
    const completed = current.completedSteps.includes(stepIndex)
      ? current.completedSteps
      : [...current.completedSteps, stepIndex].sort((left, right) => left - right);
    const next = {
      ...current,
      currentStepIndex: Math.max(current.currentStepIndex, stepIndex),
      completedSteps: completed,
    } satisfies CurriculumProgress;

    this.#db
      .query("INSERT OR REPLACE INTO curriculum_progress (domain, json) VALUES (?, ?)")
      .run(domain, JSON.stringify(next));
  }

  getCurriculumProgress(domain: string): CurriculumProgress | undefined {
    const row = this.#db.query("SELECT json FROM curriculum_progress WHERE domain = ?").get(domain) as JsonRow | null;
    return row === null ? undefined : (JSON.parse(row.json) as CurriculumProgress);
  }

  upsertLocalSkill(skill: LocalSkillRecord): void {
    this.#db
      .query("INSERT OR REPLACE INTO local_skills (id, json) VALUES (?, ?)")
      .run(String(skill.id), JSON.stringify(skill));
  }

  listLocalSkills(): readonly LocalSkillRecord[] {
    const rows = this.#db.query("SELECT json FROM local_skills ORDER BY id").all() as JsonRow[];
    return rows.map((row) => JSON.parse(row.json) as LocalSkillRecord);
  }

  upsertSemanticFact(fact: SemanticFactRecord): void {
    this.#db
      .query("INSERT OR REPLACE INTO semantic_facts (id, domain, json) VALUES (?, ?, ?)")
      .run(fact.id, fact.domain, JSON.stringify(fact));
  }

  listSemanticFacts(domain?: string): readonly SemanticFactRecord[] {
    const rows =
      domain === undefined
        ? (this.#db.query("SELECT json FROM semantic_facts ORDER BY id").all() as JsonRow[])
        : (this.#db.query("SELECT json FROM semantic_facts WHERE domain = ? ORDER BY id").all(domain) as JsonRow[]);
    return rows.map((row) => JSON.parse(row.json) as SemanticFactRecord);
  }

  upsertAntiPatternCandidate(candidate: AntiPatternCandidateRecord): void {
    this.#db
      .query("INSERT OR REPLACE INTO dream_candidates (id, kind, domain, json) VALUES (?, 'anti-pattern', ?, ?)")
      .run(candidate.id, candidate.domain, JSON.stringify(candidate));
  }

  listAntiPatternCandidates(domain?: string): readonly AntiPatternCandidateRecord[] {
    const rows =
      domain === undefined
        ? (this.#db
            .query("SELECT json FROM dream_candidates WHERE kind = 'anti-pattern' ORDER BY id")
            .all() as CandidateRow[])
        : (this.#db
            .query("SELECT json FROM dream_candidates WHERE kind = 'anti-pattern' AND domain = ? ORDER BY id")
            .all(domain) as CandidateRow[]);
    return rows.map((row) => JSON.parse(row.json) as AntiPatternCandidateRecord);
  }

  upsertTraceCandidate(candidate: TraceCandidateRecord): void {
    this.#db
      .query("INSERT OR REPLACE INTO dream_candidates (id, kind, domain, json) VALUES (?, 'trace', ?, ?)")
      .run(candidate.id, candidate.domain, JSON.stringify(candidate));
  }

  listTraceCandidates(domain?: string): readonly TraceCandidateRecord[] {
    const rows =
      domain === undefined
        ? (this.#db.query("SELECT json FROM dream_candidates WHERE kind = 'trace' ORDER BY id").all() as CandidateRow[])
        : (this.#db
            .query("SELECT json FROM dream_candidates WHERE kind = 'trace' AND domain = ? ORDER BY id")
            .all(domain) as CandidateRow[]);
    return rows.map((row) => JSON.parse(row.json) as TraceCandidateRecord);
  }

  setIdentity(identity: Identity): void {
    this.#db.query("INSERT OR REPLACE INTO identity (id, json) VALUES ('current', ?)").run(JSON.stringify(identity));
  }

  getIdentity(): Identity | undefined {
    const row = this.#db.query("SELECT json FROM identity WHERE id = 'current'").get() as JsonRow | null;
    return row === null ? undefined : (JSON.parse(row.json) as Identity);
  }

  queuePublishableArtifact(artifact: PublishableArtifact): void {
    this.#db.query("INSERT INTO publishable_artifacts (json) VALUES (?)").run(JSON.stringify(artifact));
  }

  listPublishableArtifacts(): readonly PublishableArtifact[] {
    const rows = this.#db.query("SELECT json FROM publishable_artifacts ORDER BY sequence").all() as JsonRow[];
    return rows.map((row) => JSON.parse(row.json) as PublishableArtifact);
  }
}
