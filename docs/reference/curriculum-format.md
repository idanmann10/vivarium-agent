---
title: Curriculum Format
description: Reference for curricula.
when_to_read: When validating domain learning paths.
---

# Curriculum Format

The canonical TypeScript shape is `packages/core/src/types/curriculum.ts`. Curricula define domain-specific onboarding paths and keep progress separate from the static path.

## Curriculum

```ts
interface Curriculum {
  domain: string;
  version: number;
  description: string;
  steps: readonly CurriculumStep[];
}
```

`domain` matches the run domain used for retrieval and identity stage tracking. `version` increments when the learning path changes. `description` summarizes what the path teaches. `steps` are ordered by each step's `index`.

## CurriculumStep

```ts
interface CurriculumStep {
  index: number;
  title: string;
  description: string;
  required: boolean;
  references: {
    skills: readonly SkillId[];
    traces: readonly TraceId[];
    runs: readonly RunId[];
    starterGoals: readonly string[];
  };
}
```

`required` marks steps that should gate local progress for the domain. `references` keeps the path grounded in concrete world artifacts: `skills` for procedural knowledge, `traces` for worked examples, `runs` for published history, and `starterGoals` for local practice prompts.

## CurriculumProgress

```ts
interface CurriculumProgress {
  domain: string;
  currentStepIndex: number;
  completedSteps: readonly number[];
  startedAt: string;
}
```

Progress is runtime state. It belongs in the state repository, not in the world curriculum file.
