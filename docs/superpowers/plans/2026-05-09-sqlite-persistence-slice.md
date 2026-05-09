# SQLite Persistence Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a durable SQLite-backed state repository that matches the current in-memory repository behavior.

**Architecture:** Keep the existing in-memory repository unchanged. Add `SQLiteStateRepository` with the same public method names and schema initialization. Store typed aggregate values as JSON when queryability is not yet needed.

**Tech Stack:** Bun test, TypeScript ESM, `bun:sqlite`.

---

### Task 1: Persistence Tests

**Files:**
- Create: `packages/state/src/sqlite-repository.test.ts`

- [ ] Write a failing test that creates a SQLite repository, writes all supported state types, closes it, reopens it, and reads the same values.
- [ ] Run the test and confirm it fails because `SQLiteStateRepository` does not exist.

### Task 2: Repository Implementation

**Files:**
- Create: `packages/state/src/sqlite-repository.ts`
- Modify: `packages/state/src/index.ts`

- [ ] Implement schema initialization.
- [ ] Implement the same public methods used by `InMemoryStateRepository`.
- [ ] Export the repository.

### Task 3: Verification

**Commands:**
- `bun test packages/state/src/sqlite-repository.test.ts`
- `bun run lint`
- `bun run typecheck`
- `bun run test`
- `bun run build`

- [ ] Run all commands and fix root causes of any failures.
- [ ] Commit the persistence slice.
