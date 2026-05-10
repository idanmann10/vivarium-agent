---
title: Traces
description: Traces are annotated teaching artifacts distinct from raw runs.
when_to_read: When authoring trace extraction or trace retrieval.
---

# Traces

Traces are deliberate walkthroughs. They teach a reusable workflow with annotations, pitfalls, and alternatives.

A trace is not a raw run log. It is an edited teaching artifact that explains how
to perform a task, what mattered, and what to watch for when repeating it.

## Shape

Each trace contains `prerequisites`, one or more `TraceStep` entries, `pitfalls`,
and `alternatives`. A `TraceStep` records an action and an annotation, so the
trace teaches intent instead of merely replaying commands.

## Use

Retrieval can put traces beside skills when an agent needs an example, not just a
procedure. Dream can extract trace candidates from successful runs, but the
candidate still needs enough annotation to be useful to a different agent.
