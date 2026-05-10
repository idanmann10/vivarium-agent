---
title: Trust
description: Trust-weighted scoring for contributor history.
when_to_read: When implementing contribution gates.
---

# Trust

Trust weights contribution evidence without letting one contributor dominate the world.

## Contributor Trust

```text
trust(contributor) = sigmoid(sum(LB(skill) * log1p(uses(skill))))
sigmoid(x) = 1 / (1 + e^-x)
```

`log1p` dampens very high use counts. The sigmoid bounds trust in `[0, 1]`.

## Effective Lower Bound

```text
effective_LB = LB * (0.85 + 0.15 * trust)
```

At `trust = 0`, a skill keeps 85% of its lower bound. At `trust = 1`, it keeps 100%. A contributor at `trust = 0.5` gets a `0.925x` multiplier.

## Used By

`effective_LB` feeds retrieval scoring and world auto-merge thresholds. It is not a substitute for validator votes, regression checks, or maintainer veto windows.
