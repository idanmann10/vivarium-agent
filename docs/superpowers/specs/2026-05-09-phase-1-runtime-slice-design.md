# Phase 1 Runtime Slice Design

## Context

`goal.md` defines Phase 1 as "Agent works alone": state, providers, self-tools, external tools, credentials, safety, primitives, orchestrator, read-only world paths, daemon, CLI, and e2e tests. Full production integrations are large enough to split over several branches, but the next recoverable slice should make the scaffold executable end-to-end without requiring live API keys.

## Approach

Build a local deterministic runtime path that exercises the same interfaces Phase 1 will use with real providers later:

- `state` owns an in-memory repository for runs, episodes, skills, anti-patterns, traces, confidence buckets, and curriculum progress.
- `providers` owns a capability-aware router plus a deterministic local provider that can produce plan, prediction, validation, and reflection text for tests and offline CLI use.
- `tools` owns builtin self-tools backed by the state repository and safety checks for external HTTP requests.
- `world` reads the local `the-world` filesystem and returns ranked skills, anti-patterns, and traces.
- `runtime` orchestrates Plan -> Predict -> Execute -> Monitor -> Validate -> Reflect on a synthetic goal. It logs typed episodes, performs automatic anti-pattern/world lookup, advances curriculum progress, and updates confidence buckets.
- `apps/cli` exposes `run`, `status`, and `doctor` helpers over the local runtime for this offline slice.

## Non-Goals

- No real Anthropic/OpenAI HTTP calls in this slice.
- No SQLite migrations in this slice.
- No Dream consolidation in this slice.
- No world writes or GitHub PR creation in this slice.

## Success Criteria

- `tests/e2e-run.test.ts` proves a synthetic goal produces run_start, plan, prediction, action, observation, validation, reflection, and run_end episodes.
- `tests/e2e-recover.test.ts` proves monitor-triggered recovery records a recovery episode after a forced failure.
- State tests prove confidence buckets and curriculum progress update.
- World tests prove local seeded skills, anti-patterns, and traces are retrieved.
- `bun run lint && bun run typecheck && bun run test && bun run build` pass in `the-agent`.
