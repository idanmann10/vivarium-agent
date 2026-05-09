# Run Safety Behavior Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add harmful-refusal and destructive-confirmation behavior to `runGoal`.

**Architecture:** Keep deterministic safety classification in runtime, before primitive dispatch. Use existing `refusal` and `recovery` episode kinds so schema changes are not needed.

**Tech Stack:** Bun, TypeScript, `bun:test`.

---

### Task 1: Safety Tests

**Files:**
- Modify: `packages/runtime/src/orchestrator.test.ts`

- [x] **Step 1: Write failing tests**

Add tests for harmful refusal, unconfirmed destructive escalation, and confirmed destructive continuation.

- [x] **Step 2: Run test to verify it fails**

Run: `bun test packages/runtime/src/orchestrator.test.ts`

### Task 2: Implement Safety

**Files:**
- Create: `packages/runtime/src/safety.ts`
- Modify: `packages/runtime/src/orchestrator.ts`
- Modify: `packages/runtime/src/index.ts`

- [x] **Step 1: Implement classifier and run flow**

Refuse harmful requests and escalate unconfirmed destructive requests before Plan.

### Task 3: Verify and Commit

Run full gates, update audits/memory, and commit with `git commit -m "feat: add run safety behavior"`.

## Self-Review

- Spec coverage: refusal, destructive hold, confirmed continuation, and tests are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: public safety function is `classifyGoalSafety`.
