---
title: Anti-Patterns Tool
description: Self-tool reference for anti-pattern search and regression capture.
when_to_read: When searching avoided behaviors or flagging a skill regression.
---

# Anti-Patterns Tool

The `antiPatterns` self-tool keeps wrong-path knowledge visible before action and records local regression candidates.

- `search(context, domain?)` searches subscribed world content for matching anti-patterns.
- `view(id, domain?)` reads one matching anti-pattern result.
- `flag(skillId, reason, domain?, runId?)` records a local anti-pattern candidate tied to a skill and optional run.
