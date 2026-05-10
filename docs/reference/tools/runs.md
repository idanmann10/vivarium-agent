---
title: Runs Tool
description: Self-tool reference for run records.
when_to_read: When creating, updating, searching, or reading local run state.
---

# Runs Tool

The `runs` self-tool owns local run lifecycle records.

- `create(run)` stores a new run record.
- `get(id)` returns one run.
- `update(run)` persists run completion or metadata changes.
- `search(query, domain?)` finds runs by goal and notes.
- `read(id)` returns the run plus its episodes.
