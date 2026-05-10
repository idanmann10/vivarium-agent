---
title: Episodes Tool
description: Self-tool reference for typed run episodes.
when_to_read: When recording notes, surprises, or reading run episode history.
---

# Episodes Tool

The `episodes` self-tool records the typed event stream for a run.

- `append(episode)` stores a typed episode.
- `list(runId)` returns the ordered episodes for a run.
- `note(request)` records a freeform observation episode for a run.
- `surprise(request)` records a prediction miss with actual outcome, magnitude, and optional notes.
- `recallRun(runId)` returns the ordered episodes for a prior run.
