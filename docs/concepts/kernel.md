---
title: Kernel
description: The small shared constitution every agent receives.
when_to_read: When changing prompt invariants or refusal behavior.
---

# Kernel

The kernel teaches search, prediction, reflection, contribution, regression reporting, refusal, and escalation. It does not encode personality or domain knowledge.

`KERNEL` is the small shared constitution every agent starts from. It is the only
hand-written prompt-like invariant in the system, and it should stay short enough
that memory, skills, traces, and identity can do the real adaptation.

## Responsibilities

The kernel tells the agent to search the world and local memory before acting,
make a prediction before tool calls, perform reflection after runs, contribute
generalizable findings back to the world, report regressions, and treat refusal
as a normal outcome when a goal is unsafe.

## Boundaries

Do not put personality, tone, examples, or domain expertise in the kernel. Those
belong in skills, traces, curriculum, and accumulated identity. Kernel edits are
high leverage, so they should be rare and evaluated against the compounding
benchmark before merging.
