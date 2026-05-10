---
title: Data Flow
description: How a goal turns into episodes, validation, reflection, and world contributions.
when_to_read: When implementing runtime orchestration or storage.
---

# Data Flow

This is the local runtime path from a user goal to local memory updates and optional world contributions.

## Run Loop

1. `apps/cli` or `apps/daemon` calls `runGoal` in `packages/runtime`.
2. `runGoal` creates a `Run` through self-tools and appends `run_start`.
3. Run-level safety classifies the goal. Harmful goals produce `refusal`; destructive goals without confirmation produce `recovery` with `escalate`.
4. Retrieval loads habitual local skills first, then world results filtered by domain and available tools.
5. Attention limits trim skills, traces, tools, and recent episodes before model context is built.
6. `Plan` builds a plan from the goal, provider, identity summary, and selected context.
7. `Predict` records an expected outcome and confidence, including working-memory warnings such as prompt-injection notes.
8. `Execute` calls the selected tool/provider path and records `action` plus `observation`.
9. Tool output safety scans observations. Prompt-injection findings become `surprise` episodes and semantic memory warnings.
10. `Monitor` runs on forced or off-track failure paths. `Recover` decides whether to replan, narrow, escalate, or abort.
11. `Validate` scores successful output and records pass/fail reasons.
12. `Reflect` extracts what worked, what did not, candidate skills, anti-patterns, optional trace candidates, scaffolding gaps, and publishability.
13. The run appends `run_end`, updates the stored `Run`, records confidence and curriculum progress, and queues anonymized publishable artifacts when reflection allows it.

## Episode Flow

Most run state is append-only episode history:

```text
run_start -> plan -> prediction -> action -> observation -> validation -> reflection -> run_end
```

Failure or safety branches add `refusal`, `monitor_signal`, and `recovery`. Surprise-producing paths add `surprise` between observation and validation or before a blocked external action is bridged into self-tools.

## Memory And Dream Flow

Working memory and semantic facts are read before planning or prediction when relevant. After the run, Dream can inspect run history, confidence buckets, local skills, surprise episodes, and validation results. Dream promotes, prunes, habituates, updates identity, and creates anti-pattern or trace candidates in `packages/state`.

## World Proposal Flow

Publishable run and trace bodies are anonymized in `packages/tools` before queueing. World write paths in `packages/world` serialize accepted proposals and, when configured with live GitHub credentials, can open a world proposal pull request. Local and saved world subscriptions feed future retrieval; a second install verifies accepted artifacts through `world transmission-smoke`.

## Live Verification Flow

`doctor --live` checks whether the external pieces needed for the full v1 loop are configured: final repo names, GitHub remotes and auth, canonical/private world refs, provider profiles and keys, encrypted credential metadata, Docker, and Docker Compose. Local tests verify the offline graph; live provider, GitHub, and cross-install checks still require real external configuration.
