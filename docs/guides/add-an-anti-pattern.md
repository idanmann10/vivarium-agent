---
title: Add an Anti-Pattern
description: Anti-pattern authoring.
when_to_read: When adding negative procedural memory.
---

# Add an Anti-Pattern

Name what not to do, why it fails, and what to do instead.

## File

World anti-patterns live as `ANTI-PATTERN.md` files under a domain. The accepted
artifact should include a precise title, domain, visibility, contributor, and
links to related skills when the warning constrains an existing procedure.

## Content

Write the failure in operational terms:

- `why`: the cost or failure mode.
- `insteadDo`: the safer action a future run should take.
- `relatedSkills`: skills that should retrieve this warning.
- `evidenceRunIds`: failed or low-scoring runs that demonstrate the pattern.

## Review

Treat anti-patterns as regression memory. They should be specific enough to
prevent repeat mistakes without blocking valid alternatives.
