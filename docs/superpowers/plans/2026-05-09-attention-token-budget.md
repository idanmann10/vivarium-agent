# Attention Token Budget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic token-budget accounting and enforcement to attention selection.

**Architecture:** Keep the existing count caps, then run each selected group through a small deterministic token estimator. Return budget metadata on `AttentionSelection` so downstream runtime code can inspect truncation and remaining budget.

**Tech Stack:** Bun, TypeScript, `bun:test`.

---

### Task 1: Failing Budget Test

**Files:**
- Modify: `packages/runtime/src/attention.test.ts`

- [x] **Step 1: Write failing test**

Add a low-budget attention test with long recent episodes and assert that budget metadata exists, estimated tokens stay under the configured limit, and selection is truncated.

- [x] **Step 2: Verify red**

Run: `bun test packages/runtime/src/attention.test.ts`

Expected: FAIL because `tokenBudget` does not exist.

### Task 2: Implement Budget Accounting

**Files:**
- Modify: `packages/runtime/src/attention.ts`

- [x] **Step 1: Add token budget metadata**

Add `AttentionTokenBudget` and include it in `AttentionSelection`.

- [x] **Step 2: Add deterministic estimator and truncation**

Estimate tokens from serialized payload length and skip items that would exceed `maxWorkingTokens`.

- [x] **Step 3: Verify targeted tests**

Run: `bun test packages/runtime/src/attention.test.ts`

Expected: PASS.

### Task 3: Verify and Commit

- [x] **Step 1: Run full gates**

Run lint, typecheck, test, and build for `the-agent`.

- [x] **Step 2: Update audits and memory copies**

Record the token-budget slice and updated verification evidence.

- [x] **Step 3: Commit**

Commit with `git commit -m "feat: add attention token budget"`.

## Self-Review

- Spec coverage: budget metadata, deterministic estimate, enforcement, and tests are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: `AttentionSelection.tokenBudget` is defined by `AttentionTokenBudget`.
