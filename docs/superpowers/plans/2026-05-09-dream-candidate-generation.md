# Dream Candidate Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate and persist anti-pattern and trace candidates during deterministic Dream consolidation.

**Architecture:** Extend the existing repository APIs with two candidate queues and persist both candidate kinds through a single SQLite table keyed by deterministic IDs. Keep candidate generation inside the Dream primitive so it can read runs and episodes without introducing a new scheduler or publication path.

**Tech Stack:** Bun, TypeScript, `bun:test`, `bun:sqlite`.

---

### Task 1: Candidate Storage Tests

**Files:**
- Modify: `packages/state/src/repository.test.ts`
- Modify: `packages/state/src/sqlite-repository.test.ts`
- Modify: `packages/state/src/storage/migrations.test.ts`

- [x] **Step 1: Write failing tests**

Add tests for in-memory candidate filtering, SQLite persistence across repository instances, and the `0003_dream_candidates` migration.

- [x] **Step 2: Run tests to verify failure**

Run: `bun test packages/state/src/repository.test.ts packages/state/src/sqlite-repository.test.ts packages/state/src/storage/migrations.test.ts`

Expected: FAIL because candidate APIs and the migration table do not exist.

### Task 2: Dream Candidate Tests

**Files:**
- Modify: `packages/runtime/src/primitives/dream/primitive.test.ts`

- [x] **Step 1: Write failing Dream extraction test**

Add a failed run with monitor reasons and a successful run with action/observation/validation episodes. Assert Dream creates an anti-pattern candidate and an annotated trace candidate.

- [x] **Step 2: Run test to verify failure**

Run: `bun test packages/runtime/src/primitives/dream/primitive.test.ts`

Expected: FAIL because `DreamResult` does not include candidate IDs and state does not store candidates.

### Task 3: Implement Candidate Storage

**Files:**
- Modify: `packages/state/src/repository.ts`
- Modify: `packages/state/src/index.ts`
- Modify: `packages/state/src/sqlite-repository.ts`
- Modify: `packages/state/src/storage/migrations.ts`
- Modify: `packages/state/src/storage/schema.ts`
- Create: `packages/state/src/storage/migrations/0003_dream_candidates.sql`

- [x] **Step 1: Add repository records and methods**

Add `AntiPatternCandidateRecord` and `TraceCandidateRecord` plus upsert/list methods for both candidate kinds.

- [x] **Step 2: Add SQLite migration and persistence methods**

Create `dream_candidates` and store both candidate kinds as JSON rows scoped by kind/domain.

### Task 4: Implement Dream Extraction

**Files:**
- Modify: `packages/runtime/src/primitives/dream/primitive.ts`

- [x] **Step 1: Generate anti-pattern candidates**

For failed or low-score runs, create deterministic anti-pattern candidates using monitor reasons or run notes as evidence.

- [x] **Step 2: Generate annotated trace candidates**

For successful high-score runs, convert run episodes into trace steps with annotations.

- [x] **Step 3: Verify targeted tests**

Run: `bun test packages/state/src/repository.test.ts packages/state/src/sqlite-repository.test.ts packages/state/src/storage/migrations.test.ts packages/runtime/src/primitives/dream/primitive.test.ts`

Expected: PASS.

### Task 5: Verify and Commit

- [x] **Step 1: Run full gates**

Run lint, typecheck, test, and build for `the-agent`.

- [x] **Step 2: Update audits and memory copies**

Record the candidate-generation slice and updated verification evidence.

- [x] **Step 3: Commit**

Commit with `git commit -m "feat: add dream candidate generation"`.

## Self-Review

- Spec coverage: state persistence, migration, failed-run anti-patterns, successful-run traces, annotations, and result IDs are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: public repository APIs use `upsert*Candidate` and `list*Candidates`.
