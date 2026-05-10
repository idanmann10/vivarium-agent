---
title: Identity Tool
description: Self-tool reference for reading local identity state.
when_to_read: When summarizing who the agent is, checking stage, or reviewing recent run history.
---

# Identity Tool

The `identity` self-tool reads the current local identity summary, per-domain developmental stage, and recent run summaries.

- `summary()` returns the current who-am-I summary, or a clear empty-state message if Dream has not written one yet.
- `stage(domain)` returns the current developmental stage for the requested domain, if known.
- `history(limit?)` returns recent run summaries with run id, domain, goal, success, score, and notes.
