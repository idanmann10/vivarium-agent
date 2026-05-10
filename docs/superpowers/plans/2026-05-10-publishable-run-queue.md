# Publishable Run Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Queue anonymized publishable run artifacts when Reflect marks a run publishable.

**Architecture:** Keep Reflect as the publishability decision point. Add optional `surprises` to `runGoal`, pass them to Reflect, then use self-tools to queue an anonymized run artifact only when Reflect returns `publishable: true`.

**Tech Stack:** Bun, TypeScript, `bun:test`.

---

### Task 1: Failing Publishability Test

**Files:**
- Modify: `packages/runtime/src/orchestrator.test.ts`

- [x] **Step 1: Write failing test**

Add a run test with surprise notes and sensitive goal text. Assert the run is marked publishable, one publishable run artifact is queued, and sensitive text is redacted.

- [x] **Step 2: Verify red**

Run: `bun test packages/runtime/src/orchestrator.test.ts`

Expected: FAIL because `runGoal` ignores Reflect publishability and does not queue artifacts.

### Task 2: Implement Publishable Queue

**Files:**
- Modify: `packages/tools/src/builtin/self-tools.ts`
- Modify: `packages/runtime/src/orchestrator.ts`

- [x] **Step 1: Add publishable self-tools**

Expose `publishables.queue` and `publishables.list` over the existing state repository artifact queue.

- [x] **Step 2: Wire Reflect publishability**

Pass optional surprises into Reflect, mark the completed run publishable when appropriate, anonymize the artifact body, and queue it as `kind: "run"`.

- [x] **Step 3: Verify targeted tests**

Run: `bun test packages/runtime/src/orchestrator.test.ts packages/tools/src/builtin/self-tools.test.ts`

Expected: PASS.

### Task 3: Verify and Commit

- [x] **Step 1: Run full gates**

Run lint, typecheck, test, and build for `the-agent`.

- [x] **Step 2: Update audits and memory copies**

Record the publishable run queue slice and updated verification evidence.

- [x] **Step 3: Commit**

Commit with `git commit -m "feat: queue publishable run artifacts"`.

## Self-Review

- Spec coverage: Reflect signal, run flag, queue helper, redaction, and tests are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: queued artifacts use existing `PublishableArtifact` shape.
