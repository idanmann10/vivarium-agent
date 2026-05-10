---
title: Thesis
description: Why the agent grows through experience and shared culture instead of per-agent prompting.
when_to_read: When evaluating the product direction or kernel constraints.
---

# Thesis

Agents should grow from runs, memory, reflection, and cultural transmission. The kernel stays small; skills, traces, anti-patterns, and identity carry learned behavior.

The product bet is that durable agent behavior should come from experience, not
from a large per-agent prompt. The shared `kernel` is a compact constitution:
search memory and the world, predict before acting, reflect after runs, refuse
harmful work, and ask for help when stuck. Everything more specific should be
learned, retrieved, consolidated, or contributed.

## Why Experience Is The Unit

Runs create evidence. Episodes preserve what happened. Reflection identifies
what worked, what failed, and what surprised the agent. Dream turns that history
into semantic facts, procedural skill changes, anti-pattern candidates, trace
candidates, confidence calibration, habituation, and identity updates.

This mirrors the shape of several research lines named in the roadmap:

- Generative Agents: memory, reflection, and planning become a substrate for
  coherent behavior over time.
- Voyager: a growing skill library lets an agent keep useful procedures instead
  of relearning them from scratch.
- DGM: improvement compounds when changes are evaluated, selected, and preserved
  through a population or artifact history.
- MAGELLAN: learning progress can guide exploration toward domains where the
  agent is still improving.
- sleep consolidation: offline consolidation can reorganize experience into
  future-useful memory rather than treating every run as isolated context.

## Why The World Exists

The world is shared culture: skills, traces, anti-patterns, runs, curricula,
rubrics, exemplars, contributor profiles, and featured picks. A local agent can
pull from that culture, learn privately, and propose generalizable artifacts back
when evidence supports them.

This makes cultural transmission explicit. A successful run can become a trace,
a repeated failure can become an anti-pattern, and a useful procedure can become
a skill. Other installs can retrieve those artifacts without sharing private
state or relying on a central service.

## Why Local-First

The agent must be useful before any cloud dependency exists. State lives locally,
providers and API credentials are BYO, and the world is Git-hosted. The full live
loop can use GitHub and remote model providers, but the core behavior remains
local-first: memory, Dream, retrieval, and deterministic tests all work against a
local checkout.

Local-first also preserves user control. Private worlds can hold team-specific
knowledge, public worlds can hold shared culture, and the agent can route
visibility-sensitive proposals to the right place.

## Design Constraint

Do not solve missing behavior by expanding the kernel into a giant prompt. Add
experience capture, retrieval, safety checks, math gates, or world artifacts
instead. If a behavior should improve over time, it belongs in memory, Dream, a
skill, a trace, an anti-pattern, curriculum, or identity.
