# Tool Availability Retrieval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pass active toolset/tool metadata from CLI commands into world retrieval so `requires_*` and `fallback_for_*` skill metadata affects real runs.

**Architecture:** Extend existing request option objects with `availableToolsets` and `availableTools`. This keeps filtering inside `LocalWorldReader`, while CLI/runtime callers only forward the active capability metadata.

**Tech Stack:** TypeScript, Bun, `bun:test`.

---

### Task 1: Failing Tests

**Files:**
- Modify: `apps/cli/src/commands/world.test.ts`
- Modify: `apps/cli/src/commands/run.test.ts`

- [x] **Step 1: Assert world search passthrough**

Create required and fallback skills, then verify `searchWorldCommand` returns the required skill only when availability is provided.

- [x] **Step 2: Assert run planning passthrough**

Run goals against required/fallback skills and verify the returned transparency plan lists the correct consulted skill.

- [x] **Step 3: Verify red**

Run: `bun test apps/cli/src/commands/world.test.ts apps/cli/src/commands/run.test.ts`

Expected: FAIL because command/runtime options ignore active tool availability.

### Task 2: Implement Passthrough

**Files:**
- Modify: `packages/world/src/retrieve.ts`
- Modify: `packages/runtime/src/orchestrator.ts`
- Modify: `apps/cli/src/commands/world.ts`
- Modify: `apps/cli/src/commands/run.ts`
- Modify: `apps/cli/src/dispatcher.ts`

- [x] **Step 1: Extend request types**

Add optional `availableToolsets` and `availableTools` arrays where requests cross package boundaries.

- [x] **Step 2: Forward to local readers**

Pass the arrays to direct and subscribed world searches.

- [x] **Step 3: Forward to runtime run retrieval**

Pass the arrays from `runCommand` into `runGoal` and then into `tools.world.search`.

- [x] **Step 4: Route CLI flags**

Use repeated `--available-toolset` and `--available-tool` flags for `run` and `world search`.

- [x] **Step 5: Verify focused tests**

Run: `bun test apps/cli/src/commands/world.test.ts apps/cli/src/commands/run.test.ts apps/cli/src/dispatcher.test.ts`

Expected: PASS.

### Task 3: Verify and Commit

- [x] **Step 1: Run agent gates**

Run lint, typecheck, test, build, format check, and `git diff --check` in `the-agent`.

- [x] **Step 2: Update audit**

Record active tool availability passthrough coverage in the active completion audit.

- [x] **Step 3: Commit**

Commit with `git commit -m "feat(world): pass tool availability into retrieval"`.
