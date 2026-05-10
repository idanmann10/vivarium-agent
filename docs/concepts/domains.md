---
title: Domains
description: Domains act as subcultures with their own curricula and conventions.
when_to_read: When working on retrieval, stage scoring, or world content layout.
---

# Domains

Stages, curricula, trust, and retrieval are domain-sensitive. An agent can be senior in one domain and newborn in another.

A domain is a subculture inside the world. `coding`, `writing`, and `research`
can each have their own skills, traces, rubrics, exemplars, anti-patterns, and
starter curriculum because useful practice in one domain is not automatically
useful in another.

## Runtime Effects

Retrieval scores include domain match. Dream updates identity and developmental
stage per domain, so a strong coding history does not make the agent senior in
research. Curriculum progress is also domain-scoped: completing a writing step
should not advance the coding curriculum.

## World Layout

World content is grouped by domain, with shared artifact types inside each group.
This keeps local search cheap, lets starter packs install the right material, and
lets private worlds override or extend a canonical domain without replacing the
whole commons.
