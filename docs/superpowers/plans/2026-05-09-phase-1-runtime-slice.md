# Phase 1 Runtime Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Phase 1 executable offline by wiring state, world retrieval, provider routing, tools, primitives, orchestrator, and CLI helpers into one tested local runtime path.

**Architecture:** Build deterministic interfaces first. The in-memory state repository, local provider, and filesystem world reader exercise the same contracts that SQLite, real model providers, and GitHub-backed worlds will use later.

**Tech Stack:** Bun test, TypeScript ESM, local filesystem reads, pure TypeScript package interfaces.

---

### Task 1: State Repository

**Files:**
- Create: `packages/state/src/repository.ts`
- Create: `packages/state/src/repository.test.ts`
- Modify: `packages/state/src/index.ts`

- [ ] Write tests for run/episode append, confidence bucket updates, curriculum progress.
- [ ] Run `bun test packages/state/src/repository.test.ts` and confirm failure from missing implementation.
- [ ] Implement `InMemoryStateRepository`.
- [ ] Run the state test and confirm pass.

### Task 2: Provider Router

**Files:**
- Create: `packages/providers/src/local.ts`
- Create: `packages/providers/src/router.test.ts`
- Modify: `packages/providers/src/router.ts`
- Modify: `packages/providers/src/index.ts`

- [ ] Write router tests for capability/cost matching and deterministic local responses.
- [ ] Run provider tests and confirm failure from missing implementation.
- [ ] Implement router and local provider.
- [ ] Run provider tests and confirm pass.

### Task 3: World Reader

**Files:**
- Create: `packages/world/src/local-reader.ts`
- Create: `packages/world/src/local-reader.test.ts`
- Modify: `packages/world/src/index.ts`

- [ ] Write tests proving local skills, anti-patterns, and traces can be read from `../the-world`.
- [ ] Run world tests and confirm failure from missing implementation.
- [ ] Implement filesystem reader and simple ranking.
- [ ] Run world tests and confirm pass.

### Task 4: Tools and Safety

**Files:**
- Create: `packages/tools/src/builtin/self-tools.ts`
- Create: `packages/tools/src/builtin/self-tools.test.ts`
- Create: `packages/tools/src/safety/pipeline.test.ts`
- Modify: `packages/tools/src/safety/pipeline.ts`
- Modify: `packages/tools/src/index.ts`

- [ ] Write tests for memory, world, curriculum, confidence, and safety decisions.
- [ ] Run tool tests and confirm failure from missing behavior.
- [ ] Implement self-tools and safety allowlist checks.
- [ ] Run tool tests and confirm pass.

### Task 5: Runtime Orchestrator

**Files:**
- Create: `packages/runtime/src/orchestrator.test.ts`
- Modify: `packages/runtime/src/orchestrator.ts`
- Modify: `packages/runtime/src/index.ts`

- [ ] Write tests for successful run and forced-failure recovery.
- [ ] Run runtime tests and confirm failure from missing behavior.
- [ ] Implement the deterministic Plan -> Reflect orchestration path.
- [ ] Run runtime tests and confirm pass.

### Task 6: CLI Helpers and E2E Tests

**Files:**
- Create: `tests/e2e-run.test.ts`
- Create: `tests/e2e-recover.test.ts`
- Modify: `apps/cli/src/commands/run.ts`
- Modify: `apps/cli/src/commands/status.ts`
- Modify: `apps/cli/src/commands/doctor.ts`
- Modify: `apps/cli/src/index.ts`

- [ ] Write e2e tests around CLI helper functions and runtime episodes.
- [ ] Run e2e tests and confirm failure from missing helpers.
- [ ] Implement helper functions.
- [ ] Run full gates and commit.
