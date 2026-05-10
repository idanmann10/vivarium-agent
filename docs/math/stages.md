---
title: Stages
description: Per-domain developmental stage thresholds.
when_to_read: When implementing identity and stage transitions.
---

# Stages

Development stage is tracked per domain. It reflects volume, success rate, and diversity of procedural memory.

## Formula

```text
developmentScore = runsCompleted * successRate * skillDiversity
```

`runsCompleted` and `skillDiversity` must be non-negative. `successRate` must be in `[0, 1]`.

## Thresholds

| Score | Stage |
| --- | --- |
| `< 5` | `newborn` |
| `5` to `< 25` | `apprentice` |
| `25` to `< 100` | `journeyman` |
| `100` to `< 400` | `senior` |
| `>= 400` | `master` |

## Used By

Identity self-tools expose the current stage, and Dream updates identity summaries as run history grows.
