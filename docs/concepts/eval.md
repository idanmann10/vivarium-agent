---
title: Eval
description: Compounding evaluation and selection signals.
when_to_read: When implementing Dream or measuring improvement across cycles.
---

# Eval

The compounding eval measures whether dream consolidation improves later runs.

The eval asks whether experience compounds. It compares benchmark behavior
before and after Dream has promoted skills, created anti-patterns, extracted
traces, updated identity, and recalibrated confidence.

## Signal

A single lucky run is not enough. The benchmark aggregates cases and measures the
delta between before and after scores. Positive movement means consolidation
helped later work; negative movement means Dream may have promoted the wrong
memory or overfit to a bad example.

## Use

Compounding eval output is evidence for local changes and world proposals. It is
also a guardrail for kernel, math, retrieval, and Dream changes: if a change makes
later benchmark performance worse, it should be treated as a regression even when
individual tests still pass.
