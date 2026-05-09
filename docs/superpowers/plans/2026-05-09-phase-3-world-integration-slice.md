# Phase 3 World Integration Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the loop locally by letting one install propose/publish world artifacts and another install retrieve them through multi-world subscriptions.

**Architecture:** Use filesystem-backed world operations that mirror later GitHub operations. Keep writes behind explicit functions, keep retrieval source-aware, and validate generated files with world scripts.

**Tech Stack:** Bun test, TypeScript ESM, local filesystem fixtures.

---

### Task 1: Agent World Writes

**Files:**
- Modify: `packages/world/src/push.ts`
- Modify: `packages/world/src/runs.ts`
- Modify: `packages/world/src/traces.ts`
- Create: `packages/world/src/write.test.ts`

- [ ] Add failing tests for proposing a skill and publishing run/trace files.
- [ ] Implement local filesystem writes.
- [ ] Verify package tests pass.

### Task 2: Multi-World Retrieval

**Files:**
- Modify: `packages/world/src/retrieve.ts`
- Create: `packages/world/src/retrieve.test.ts`
- Modify: `packages/world/src/index.ts`

- [ ] Add failing tests for priority-ordered multi-world search.
- [ ] Implement source-aware retrieval.
- [ ] Verify package tests pass.

### Task 3: World Repo Scripts

**Files:**
- Modify: `../the-world/scripts/compute-stats.ts`
- Modify: `../the-world/scripts/archive-regression.ts`
- Modify: `../the-world/scripts/flag-stale.ts`
- Create: `../the-world/scripts/world-ops.test.ts`

- [ ] Add failing tests for stats, archive, and stale scan helpers.
- [ ] Implement helpers without live GitHub dependencies.
- [ ] Verify world tests pass.

### Task 4: E2E Cultural Transmission

**Files:**
- Create: `tests/e2e-world-integration.test.ts`

- [ ] Add failing test simulating install A publish and install B retrieval.
- [ ] Implement missing glue.
- [ ] Run gates in both repos and commit.
