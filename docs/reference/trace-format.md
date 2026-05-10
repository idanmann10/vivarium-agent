---
title: Trace Format
description: Reference for trace metadata and steps.
when_to_read: When validating traces.
---

# Trace Format

The canonical TypeScript shape is `packages/core/src/types/trace.ts`. A `Trace` is a publishable worked example: it teaches by showing steps, observations, and annotations from a concrete run or authored scenario.

## Trace

```ts
interface Trace {
  id: TraceId;
  title: string;
  description: string;
  domain: string;
  prerequisites: readonly SkillId[];
  teaches: readonly string[];
  visibility: Visibility;
  steps: readonly TraceStep[];
  pitfalls: readonly string[];
  alternatives: readonly string[];
  extractedFrom?: RunId;
  contributorId: ContributorId;
  createdAt: string;
}
```

`prerequisites` names skills a reader should already understand. `teaches` lists the concepts or tactics the trace demonstrates. `pitfalls` records mistakes the example helps avoid. `alternatives` keeps competing approaches visible. `extractedFrom` points back to the source run when Dream extracts the trace from run history.

## TraceStep

```ts
interface TraceStep {
  index: number;
  action: string;
  observation?: string;
  annotation?: string;
  reflection?: string;
}
```

`index` orders the steps. `action` is what the agent or user did. `observation` is what happened. `annotation` explains why the step matters. `reflection` records the lesson learned from that step.

## TraceCandidateProposal

```ts
interface TraceCandidateProposal {
  title: string;
  domain: string;
  sourceRunId: RunId;
  teaches: readonly string[];
}
```

Trace candidates are lightweight Dream outputs. A full trace should be authored from the candidate before publication, with steps, pitfalls, alternatives, contributor metadata, and anonymization as needed.
