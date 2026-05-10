# Self-Tools SQLite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand built-in self-tools and make them work against SQLite-backed local state.

**Architecture:** Introduce a `StateRepository` interface for the existing repository methods and keep both repository classes structurally aligned. Extend `createSelfTools` with state-backed roadmap self-tool groups while preserving the existing `runs`, `episodes`, `world`, `curriculum`, and `confidence` API used by runtime code.

**Tech Stack:** Bun, TypeScript, `bun:test`, `bun:sqlite`.

---

### Task 1: Failing SQLite Self-Tools Test

**Files:**
- Modify: `packages/tools/src/builtin/self-tools.test.ts`

- [x] **Step 1: Write failing test**

Add a test that creates self-tools with `SQLiteStateRepository`, then writes memory, records skill use, flags an anti-pattern candidate, and authors a trace candidate.

- [x] **Step 2: Verify red**

Run: `bun test packages/tools/src/builtin/self-tools.test.ts`

Expected: FAIL because `tools.memory` and related self-tool groups do not exist.

### Task 2: Add State Repository Interface

**Files:**
- Modify: `packages/state/src/repository.ts`
- Modify: `packages/state/src/sqlite-repository.ts`
- Modify: `packages/state/src/index.ts`

- [x] **Step 1: Define shared interface**

Add `StateRepository` with the repository methods used by runtime, Dream, and self-tools.

- [x] **Step 2: Type repository classes**

Have `InMemoryStateRepository` and `SQLiteStateRepository` implement `StateRepository`.

### Task 3: Expand Built-In Self-Tools

**Files:**
- Modify: `packages/tools/src/builtin/self-tools.ts`

- [x] **Step 1: Accept shared repository state**

Change `SelfToolsDependencies.state` from `InMemoryStateRepository` to `StateRepository`.

- [x] **Step 2: Add state-backed tool groups**

Add memory, skills, anti-pattern, trace, and run search/read helpers while keeping existing APIs.

- [x] **Step 3: Verify targeted tests**

Run: `bun test packages/tools/src/builtin/self-tools.test.ts`

Expected: PASS.

### Task 4: Verify and Commit

- [x] **Step 1: Run full gates**

Run lint, typecheck, test, and build for `the-agent`.

- [x] **Step 2: Update audits and memory copies**

Record the self-tools SQLite slice and updated verification evidence.

- [x] **Step 3: Commit**

Commit with `git commit -m "feat: expand sqlite self tools"`.

## Self-Review

- Spec coverage: shared repository type, SQLite self-tools, roadmap tool groups, compatibility, and tests are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: public repository interface is `StateRepository`.
