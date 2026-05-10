# Compounding Eval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder compounding eval with a deterministic synthetic benchmark evaluator.

**Architecture:** Add typed benchmark case inputs and aggregate outputs in `packages/eval/src/compounding.ts`. Keep the existing delta helper and build the benchmark evaluator on top of it. Update exports and the Dream e2e test so the roadmap evidence points at the richer API.

**Tech Stack:** TypeScript, Bun test.

---

### Task 1: Failing Eval Tests

**Files:**
- Modify: `packages/eval/src/compounding.test.ts`

- [x] **Step 1: Add aggregate benchmark test**

Add a test that calls `runCompoundingEvaluation` with two cases and expects per-case deltas, total procedural hits, average validation scores, aggregate delta, and `improved: true`.

- [x] **Step 2: Add empty benchmark rejection test**

Add a test that expects `runCompoundingEvaluation({ cases: [] })` to throw `compounding benchmark requires at least one case`.

- [x] **Step 3: Verify red**

Run: `bun test packages/eval/src/compounding.test.ts`

Expected: FAIL because `runCompoundingEvaluation` is not exported yet.

### Task 2: Implement Aggregate Evaluator

**Files:**
- Modify: `packages/eval/src/compounding.ts`
- Modify: `packages/eval/src/index.ts`

- [x] **Step 1: Add benchmark types and validation**

Define observation, case, per-case result, input, and aggregate result interfaces. Reject empty case lists.

- [x] **Step 2: Aggregate before/after scores**

Compute total procedural hits, average validation scores, per-case deltas, aggregate delta, and aggregate improvement.

- [x] **Step 3: Export the new API**

Export `runCompoundingEvaluation` and the new types from `packages/eval/src/index.ts`.

- [x] **Step 4: Verify green**

Run: `bun test packages/eval/src/compounding.test.ts`

Expected: PASS.

### Task 3: Wire Dream E2E Evidence

**Files:**
- Modify: `tests/e2e-dream.test.ts`

- [x] **Step 1: Use aggregate evaluator**

Replace the direct `scoreCompoundingImprovement` call with `runCompoundingEvaluation`.

- [x] **Step 2: Verify focused e2e**

Run: `bun test tests/e2e-dream.test.ts packages/eval/src/compounding.test.ts`

Expected: PASS.

### Task 4: Verify, Audit, and Commit

- [x] **Step 1: Run full agent gates**

Run lint, typecheck, test, and build for `the-agent`.

- [x] **Step 2: Update audits and memory copies**

Record the compounding eval slice and updated verification evidence.

- [x] **Step 3: Commit**

Commit with `git commit -m "feat: add compounding benchmark eval"`.

## Self-Review

- Spec coverage: benchmark aggregation, compatibility helper, e2e wiring, and non-goals are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: all new names are introduced before use.
