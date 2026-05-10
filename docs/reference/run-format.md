---
title: Run Format
description: Reference for run metadata and publication.
when_to_read: When validating published runs.
---

# Run Format

The canonical TypeScript shape is `packages/core/src/types/run.ts`. A `Run` is the durable summary for one goal attempt; detailed step history lives in episodes.

## Run

```ts
interface Run {
  id: RunId;
  agentId: AgentId;
  domain: string;
  goal: string;
  startedAt: string;
  endedAt: string | null;
  success: boolean | null;
  score: number | null;
  notes: string;
  publishable: boolean;
  published: boolean;
  publishedAt: string | null;
  visibility: Visibility;
}
```

`success` and `score` are nullable while the run is active. `notes` should summarize the result without replacing the episode transcript. `publishable` records local opt-in or policy eligibility. `published` and `publishedAt` track whether the anonymized artifact has already been sent to a world. `visibility` uses the shared `"public" | "private" | "internal"` model.

When publishing, run bodies must pass anonymization first. Published run references should still preserve `id`, `agentId`, `domain`, `goal`, timing, outcome, and validation context.
