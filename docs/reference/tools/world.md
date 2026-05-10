---
title: World Tool
description: Self-tool reference for world search and contribution.
when_to_read: When implementing world interactions.
---

# World Tool

The `world` self-tool reads subscribed worlds, imports public knowledge into local memory, and stages gated contributions back to the world.

- `search(request)` searches subscribed world content for matching skills, traces, and anti-patterns.
- `pull(request)` imports a public world skill into local procedural memory and returns the source result.
- `propose(request)` writes a skill proposal with contributor, visibility, and evidence metadata.
- `publishRun(request)` writes an anonymized run proposal for a publishable local run.
- `publishTrace(request)` writes a trace proposal from a local trace candidate.
- `subscribe(request)` persists a world subscription and returns the updated subscription list.
- `listSubscriptions()` returns saved world subscriptions.
- `lineage(skillId, domain)` reads lineage entries for a world skill in the requested domain.
- `contributors(domain?)` summarizes known contributors and trust, optionally scoped to one domain.
- `featured()` lists featured public world artifact identifiers.
- `stats()` returns a compact textual summary of local world content.
- `reportRegression(request)` records a regression candidate and may open a GitHub issue when configured.
