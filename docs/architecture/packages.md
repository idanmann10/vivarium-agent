---
title: Packages
description: Which package owns each concern in the agent monorepo.
when_to_read: When deciding where a new type, primitive, tool, provider, or storage change belongs.
---

# Packages

Apps depend on packages. Packages depend toward `core`. `core` has no I/O.

## Dependency Direction

`apps/*` are command or service entrypoints. They may compose packages and read process/environment state.

`packages/*` contain reusable implementation. Package dependencies should point inward:

```text
apps -> runtime/tools/state/world/providers/eval -> core
```

`packages/core` is the root dependency. It owns shared types, branded IDs, kernel text, result helpers, and pure math. Do not add file system, network, process, database, or provider calls to `core`.

## Ownership Map

| Path | Owns | Put changes here when |
| --- | --- | --- |
| `apps/cli` | Short-lived command parsing and local command orchestration | Adding CLI flags, command routing, JSON output shape, smoke commands, or live-readiness checks |
| `apps/daemon` | Long-running local runtime host | Adding daemon HTTP routes, MCP manifest entries, scheduled Dream behavior, or Docker/Compose service entrypoints |
| `packages/core` | Shared types and pure math | Adding IDs, artifact schemas, episode kinds, decision thresholds, retrieval math, trust math, or kernel constants |
| `packages/state` | Persistence and local memory implementations | Adding repository fields, SQLite migrations, Drizzle schema artifacts, memory modules, or local state queries |
| `packages/runtime` | Goal loop and primitives | Adding or changing Plan, Predict, Execute, Monitor, Recover, Validate, Reflect, Dream, attention selection, or run-level safety |
| `packages/tools` | Self-tools, external tools, credentials, anonymizer, and safety pipeline | Adding self-tool methods, external adapters, dispatcher safety checks, encrypted credential handling, or publish anonymization |
| `packages/providers` | LLM adapters and provider routing | Adding OpenAI, Anthropic, OpenAI-compatible, local provider, provider profile, capability, cost, or smoke-call behavior |
| `packages/world` | Local/GitHub world access and publication paths | Adding world retrieval, subscriptions, git pull, GitHub write, proposal serialization, contributors, or visibility routing |
| `packages/eval` | Evaluation signals and compounding benchmark logic | Adding benchmark cases, aggregate scoring, or post-Dream evaluation helpers |

## Common Placement Rules

- New shared type: `packages/core/src/types/`.
- New pure formula or threshold: `packages/core/src/math/`, with unit tests.
- New storage column/table: `packages/state/src/storage/` plus repository coverage.
- New runtime step: `packages/runtime/src/primitives/` and orchestrator wiring only if the run loop needs it.
- New self-tool or external tool: `packages/tools/src/`, through `dispatcher.ts` for calls that need safety, credentials, or audit events.
- New provider integration: `packages/providers/src/`; CLI profile wiring stays in `apps/cli`.
- New world artifact or GitHub path: `packages/world/src/`; CLI command wrappers stay in `apps/cli`.

## Boundaries To Preserve

- `core` must remain deterministic and I/O-free.
- Primitives should not call each other; the orchestrator sequences them.
- External tool calls should go through the tools dispatcher, not direct adapter calls.
- Publish paths should pass through anonymization before writing or proposing artifacts.
- Apps should stay thin. If command logic becomes reusable or test-heavy, move it into the owning package.
