---
title: Math
description: Entry point for the formulas backing selection, retrieval, and development stages.
when_to_read: When changing thresholds or scoring.
---

# Math

Use explicit formulas, unit tests, and tunable thresholds. The implementation lives in `packages/core/src/math/`; each formula has unit tests with known inputs.

## Files

- `wilson-score.md`: Wilson lower bound for skill quality evidence.
- `trust.md`: contributor trust and `effective_LB`.
- `retrieval-scoring.md`: retrieval composite score and recency decay.
- `surprise-magnitude.md`: prediction-vs-actual distance and Dream tagging.
- `stages.md`: per-domain developmental stage thresholds.
- `diversity.md`: epsilon-greedy exploration for non-habitual retrieval.

Decision thresholds such as promotion, world push, auto-merge, pruning, archive, habituation, trace publishability, and run publishability are implemented in `packages/core/src/math/decision-thresholds.ts` and referenced from the relevant workflow docs.
