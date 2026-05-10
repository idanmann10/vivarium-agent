---
title: Diversity
description: Epsilon-greedy exploration for non-habitual retrieval.
when_to_read: When implementing retrieval selection.
---

# Diversity

`chooseWithEpsilon` preserves exploration around non-habitual retrieval results.

## Rule

```text
chooseWithEpsilon(top, alternatives, epsilon = 0.05, random = Math.random())
```

If `random >= epsilon` or there are no `alternatives`, return `top`. If `random < epsilon`, replace the first selected item with the first alternative:

```text
[alternatives[0], ...top.slice(1)]
```

`epsilon` and `random` must both be in `[0, 1]`.

## Scope

Use this only for non-habitual retrieval. Habitual skills are stable; diversity exploration should happen around them so the system can keep competing variants alive without destabilizing proven habits.

## Used By

Retrieval selection uses epsilon-greedy diversity to avoid a monoculture where the same top-ranked skill always crowds out plausible alternatives.
