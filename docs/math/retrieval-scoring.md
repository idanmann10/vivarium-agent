---
title: Retrieval Scoring
description: Composite ranking for skills, traces, and runs.
when_to_read: When implementing world search.
---

# Retrieval Scoring

Retrieval ranking combines semantic relevance, skill quality, recency, and domain fit.

## Formula

```text
score = alpha * similarity
      + beta * effectiveLowerBound
      + gamma * recency
      + delta * domainMatch
```

Default weights:

```text
alpha = 0.45
beta = 0.35
gamma = 0.10
delta = 0.10
```

`similarity` is cosine similarity between the goal and artifact text. `effectiveLowerBound` is Wilson lower bound adjusted by contributor trust. `domainMatch` should be 1 for matching domains and 0 otherwise.

## Recency

`recencyScore({ ageDays, tauDays = 30 })` is:

```text
recency = exp(-ageDays / tauDays)
```

At `ageDays = 0`, recency is 1. At `ageDays = 30`, recency is approximately `e^-1`.

## Used By

World search and retrieval use this score for skills, traces, and published runs before attention limits decide what enters planning context.
