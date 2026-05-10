---
title: Episode Kinds
description: Reference for episode discriminants.
when_to_read: When adding or serializing episodes.
---

# Episode Kinds

The canonical TypeScript shape is `packages/core/src/types/episode.ts`. Episodes are append-only run events. Every episode shares the `BaseEpisode` fields and then adds fields selected by its `kind`.

## BaseEpisode

```ts
interface BaseEpisode {
  id: EpisodeId;
  runId: RunId;
  agentId: AgentId;
  timestamp: string;
  tags: readonly string[];
}
```

`runId` groups events into one run transcript. `tags` support retrieval and Dream selection without changing each episode kind.

## Episode

The discriminant is `kind`. Current kinds are:

| kind | Extra fields |
| --- | --- |
| `run_start` | `goal`, optional `domain` |
| `plan` | `plan`, `skillsLoaded`, `tracesLoaded` |
| `prediction` | `prediction` |
| `action` | `tool`, `args` |
| `observation` | `content` |
| `surprise` | `prediction`, `actual`, `magnitude`, optional `notes` |
| `monitor_signal` | `offTrackScore`, `reasons` |
| `recovery` | `decision`, `reason` |
| `validation` | `score`, `passed`, `reasons` |
| `skill_used` | `skillId`, `helped` |
| `reflection` | `reflection` |
| `refusal` | `reason`, `category` |
| `run_end` | `success`, optional `score` |

`Prediction` has `about`, `expected`, and `confidence`. `surprise.magnitude` is the learning signal used by Dream. `validation` records whether a run passed and why. `refusal.category` is one of `"harmful"`, `"unauthorized"`, `"out_of_scope"`, or `"destructive"`.

## Reflection

`Reflection` captures what to learn from a run: `worked`, `didntWork`, `surprises`, `skillCandidates`, `skillRefinements`, `skillPrunings`, `antiPatternCandidates`, optional `traceCandidate`, `scaffoldingGaps`, and `publishable`.

`episodeShapeManifest` snapshots the expected field set for each `Episode` kind so tests catch serialization drift.
