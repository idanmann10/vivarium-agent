---
title: Surprise Magnitude
description: Delta between predicted and actual outcomes.
when_to_read: When tagging episodes for Dream.
---

# Surprise Magnitude

Surprise magnitude measures how far the actual outcome diverged from the predicted outcome.

## Formula

```text
cosineSimilarity(left, right) = dot(left, right) / (|left| * |right|)
surpriseMagnitude(predictedEmbedding, actualEmbedding) = 1 - cosineSimilarity(predictedEmbedding, actualEmbedding)
```

The implementation requires equal-length non-empty embeddings. If either vector has zero magnitude, cosine similarity returns 0.

## Dream Tagging

`shouldTagSurprise(magnitude)` returns true when:

```text
magnitude >= 0.3
```

Below `0.3`, the episode is treated as too small a learning signal for Dream. Trace publishability uses a higher signal: at least one surprise with `magnitude > 0.4` and validation score above `0.7`.

## Used By

Runtime safety and validation paths record `surprise` episodes. Dream uses high-magnitude surprises to find lessons, anti-patterns, and trace candidates.
