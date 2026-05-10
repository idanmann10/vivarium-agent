---
title: Anti-Patterns
description: Negative procedural memory about what not to do and why.
when_to_read: When implementing lookup, regression reporting, or dream extraction.
---

# Anti-Patterns

Anti-patterns encode repeated wrong paths and their safer alternatives.

They are negative procedural memory: retrieval should put one in context when the
goal, domain, or selected skill resembles a known failure mode. A useful
anti-pattern says what not to do, why it failed, and what to try instead.

## Shape

The accepted world artifact records `why`, `insteadDo`, `relatedSkills`, domain,
visibility, and provenance. Dream can also produce local candidates with
`evidenceRunIds` so reviewers can inspect the failed runs that justify the
warning.

## Lifecycle

Failed or low-scoring runs can become candidate anti-patterns during Dream.
Maintainers or trust-gated workflows can accept them into the world, and later
regression reports can retire or update stale advice. The point is not to shame a
bad run; it is to keep future agents from repeating a predictable mistake.
