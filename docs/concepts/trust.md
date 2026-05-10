---
title: Trust
description: Contributor trust and effective lower bounds.
when_to_read: When implementing world gates or contribution ranking.
---

# Trust

Contributor trust is cumulative, log-dampened, and sigmoid-bounded. It gives high-trust contributors a limited effective score uplift.

Trust is a weighting signal, not authority. The world should value contributors
with a useful track record while still requiring evidence, validators, and
regression checks.

## Scoring

Skill quality starts with Wilson lower bounds over helped and used outcomes.
Contributor history feeds the trust function, then `effective_LB` applies only a
limited uplift. The cap keeps one prolific contributor from dominating ranking or
auto-merge decisions.

## Gates

World auto-merge still fails closed without independent validator votes, no
open regression evidence, and a clear maintainer veto window. A trusted
contributor can make a proposal easier to review, but trust does not bypass
validation.
