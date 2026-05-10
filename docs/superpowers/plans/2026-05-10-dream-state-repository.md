# Dream State Repository Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Dream run against any `StateRepository`, including SQLite-backed state.

**Architecture:** The Dream primitive already uses methods present on `StateRepository`. Replace concrete in-memory types with the interface and add a SQLite regression test.

**Tech Stack:** Bun, TypeScript, `bun:test`, `bun:sqlite`.

---

### Task 1: Failing SQLite Dream Test

**Files:**
- Modify: `packages/runtime/src/primitives/dream/primitive.test.ts`

- [x] **Step 1: Add SQLite-backed Dream test**

Create a temporary SQLite repository, seed identity, runs, and episodes, call `runDream`, and assert anti-pattern/trace candidates are persisted.

- [x] **Step 2: Verify red with typecheck**

Run: `bun run typecheck`

Expected: FAIL because `runDream` currently requires `InMemoryStateRepository`.

### Task 2: Generalize Dream State Type

**Files:**
- Modify: `packages/runtime/src/primitives/dream/primitive.ts`

- [x] **Step 1: Import `StateRepository`**

Replace the concrete `InMemoryStateRepository` type import with `StateRepository`.

- [x] **Step 2: Update helper signatures**

Change `DreamRequest.state`, `confidenceNotes`, `generateAntiPatternCandidate`, and `generateTraceCandidate` to accept `StateRepository`.

### Task 3: Verify, Audit, and Commit

- [x] **Step 1: Verify focused tests**

Run: `bun test packages/runtime/src/primitives/dream/primitive.test.ts`

Expected: PASS.

- [x] **Step 2: Run full gates**

Run lint, typecheck, test, and build for `the-agent`.

- [x] **Step 3: Update audits and memory copies**

Record the Dream state repository slice and updated verification evidence.

- [x] **Step 4: Commit**

Commit with `git commit -m "feat: run dream on state repository"`.

## Self-Review

- Spec coverage: type generalization, SQLite test, and non-goals are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: shared state type is `StateRepository`.
