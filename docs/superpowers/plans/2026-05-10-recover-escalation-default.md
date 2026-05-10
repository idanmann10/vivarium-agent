# Recover Escalation Default Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explicit no-path escalation branch to the Recover primitive.

**Architecture:** Keep Recover as a pure primitive. Add one optional request flag, branch before the existing off-track decision, and preserve current callers by defaulting to recoverable behavior.

**Tech Stack:** TypeScript, Bun, `bun:test`.

---

### Task 1: Failing Recover Escalation Test

**Files:**
- Modify: `packages/runtime/src/primitives/lifecycle.test.ts`

- [x] **Step 1: Add no-path recovery assertion**

Call `runRecoverPrimitive` with a high off-track monitor signal and `canRecover: false`, then expect `decision` to be `"escalate"`.

- [x] **Step 2: Verify red**

Run: `bun test packages/runtime/src/primitives/lifecycle.test.ts`

Expected: FAIL because Recover currently returns `"replan"`.

### Task 2: Implement Recover Escalation

**Files:**
- Modify: `packages/runtime/src/primitives/recover/primitive.ts`

- [x] **Step 1: Extend request type**

Add `readonly canRecover?: boolean` to `RecoverPrimitiveRequest`.

- [x] **Step 2: Branch to escalate**

If `canRecover === false`, return `decision: "escalate"` with the provider-backed reason.

- [x] **Step 3: Preserve existing decisions**

Keep `replan` for high off-track score and `narrow` otherwise when recovery is possible.

- [x] **Step 4: Verify focused test**

Run: `bun test packages/runtime/src/primitives/lifecycle.test.ts`

Expected: PASS.

### Task 3: Verify and Commit

- [x] **Step 1: Run agent gates**

Run lint, typecheck, test, build, format check, and `git diff --check` in `the-agent`.

- [x] **Step 2: Update audit**

Record Recover no-path escalation coverage in the active completion audit.

- [x] **Step 3: Commit**

Commit with `git commit -m "feat(runtime): escalate unrecoverable paths"`.
