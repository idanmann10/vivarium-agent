# Run Transparency Output Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CLI run output satisfy the roadmap transparency requirement using existing episode data.

**Architecture:** Add a small episode summarizer in `apps/cli/src/commands/run.ts`. The summarizer reads ordered episodes after `runGoal`, extracts plan/prediction/validation/surprise evidence, and stores it on `RunCommandResult`.

**Tech Stack:** TypeScript, Bun, `bun:test`.

---

### Task 1: Failing CLI Transparency Test

**Files:**
- Modify: `apps/cli/src/commands/run.test.ts`

- [x] **Step 1: Assert normal-run transparency**

Expect `runCommand` to return plan reasoning, prediction confidence, validation details, and consulted skill IDs.

- [x] **Step 2: Verify red**

Run: `bun test apps/cli/src/commands/run.test.ts`

Expected: FAIL because `RunCommandResult` has no transparency summary.

### Task 2: Implement Summary

**Files:**
- Modify: `apps/cli/src/commands/run.ts`

- [x] **Step 1: Add result types**

Define a `RunTransparencySummary` with plan, prediction, validation, consulted context, and high surprises.

- [x] **Step 2: Build summary from episodes**

Add a helper that reads plan, prediction, validation, and surprise episodes.

- [x] **Step 3: Return summary**

Attach the summary to successful and started run results; use an empty summary for preflight provider errors.

- [x] **Step 4: Verify focused test**

Run: `bun test apps/cli/src/commands/run.test.ts`

Expected: PASS.

### Task 3: High-Surprise Summary Coverage

**Files:**
- Modify: `apps/cli/src/commands/run.test.ts`

- [x] **Step 1: Assert high surprises are visible**

Summarize a handcrafted episode stream and verify high-magnitude surprises expose expected, actual, magnitude, and notes.

- [x] **Step 2: Keep runtime behavior unchanged**

No new CLI flag is needed because the summary reads existing `surprise` episodes.

### Task 4: Verify and Commit

- [x] **Step 1: Run agent gates**

Run lint, typecheck, test, build, format check, and `git diff --check` in `the-agent`.

- [x] **Step 2: Update audit**

Record run transparency output coverage in the active completion audit.

- [x] **Step 3: Commit**

Commit with `git commit -m "feat(cli): expose run transparency"`.
