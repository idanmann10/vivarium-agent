---
title: Memory
description: Working, episodic, semantic, procedural, and identity memory responsibilities.
when_to_read: When implementing persistence or dream consolidation.
---

# Memory

Working memory is bounded and ephemeral. Episodic memory is append-only. Semantic, procedural, and identity memory are derived from experience.

Memory is split so each system has one job. The runtime should not treat every
fact, log entry, skill, and self-description as the same kind of context.

## Systems

The working memory system is the current run's active context and is limited by
attention budgets. Episodic memory records append-only episodes such as plans,
actions, observations, surprises, validations, and reflections. Semantic memory
stores facts derived from experience. Procedural memory stores local skills and
their use statistics. Identity memory stores the current narrative summary plus
per-domain developmental stage.

## Dream Consolidation

Dream reads episodic history, semantic facts, procedural skill outcomes,
confidence buckets, and identity history. It promotes useful procedures, prunes
bad ones, extracts anti-patterns and traces, and rewrites identity from evidence
rather than from a static prompt.
