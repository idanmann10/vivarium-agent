---
title: Wilson Score
description: Lower bound scoring for skill quality evidence.
when_to_read: When implementing promotion, pruning, or world gates.
---

# Wilson Score

`wilsonLowerBound({ helped, uses, z = 1.96 })` computes the 95% Wilson lower confidence bound for a skill's observed helpfulness.

## Formula

Let:

```text
phat = helped / uses
z2 = z * z
denominator = 1 + z2 / uses
center = phat + z2 / (2 * uses)
margin = z * sqrt((phat * (1 - phat) + z2 / (4 * uses)) / uses)
LB = (center - margin) / denominator
```

If `uses` is 0, the implementation returns 0. Invalid evidence where `helped < 0`, `uses < 0`, or `helped > uses` throws.

## Examples

- `helped = 3`, `uses = 3` gives `0.4385`.
- `helped = 100`, `uses = 120` gives `0.7565`.

## Used By

Wilson lower bounds feed promotion, pruning, world push, habituation, archive, and trust-related gates. Use the lower bound instead of raw success rate so low-sample skills do not get over-promoted.
