import type { RunId, SkillId, TraceId } from "../ids.js";

export interface CurriculumStep {
  readonly index: number;
  readonly title: string;
  readonly description: string;
  readonly required: boolean;
  readonly references: {
    readonly skills: readonly SkillId[];
    readonly traces: readonly TraceId[];
    readonly runs: readonly RunId[];
    readonly starterGoals: readonly string[];
  };
}

export interface Curriculum {
  readonly domain: string;
  readonly version: number;
  readonly description: string;
  readonly steps: readonly CurriculumStep[];
}

export interface CurriculumProgress {
  readonly domain: string;
  readonly currentStepIndex: number;
  readonly completedSteps: readonly number[];
  readonly startedAt: string;
}
