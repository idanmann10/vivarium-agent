# Daemon Dream Scheduler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a daemon-owned Dream scheduler loop with deterministic tests.

**Architecture:** Keep `shouldRunDream` as the pure scheduling predicate. Add `createDreamScheduler` as a small stateful wrapper that calls injected `dream` and `getDomainStats` callbacks when due, tracks status, and owns a recurring timer between `start()` and `stop()`.

**Tech Stack:** Bun, TypeScript, `bun:test`.

---

### Task 1: Failing Scheduler Loop Tests

**Files:**
- Modify: `apps/daemon/src/scheduler.test.ts`

- [x] **Step 1: Write failing tests**

Add tests proving the scheduler runs Dream when due, skips a second same-day tick, records status, starts an injected interval, invokes the interval callback, and clears the interval on stop.

- [x] **Step 2: Verify red**

Run: `bun test apps/daemon/src/scheduler.test.ts`

Expected: FAIL because `createDreamScheduler` is not exported.

### Task 2: Implement Scheduler Loop

**Files:**
- Modify: `apps/daemon/src/scheduler.ts`
- Modify: `apps/daemon/src/index.ts`

- [x] **Step 1: Add scheduler interfaces and implementation**

Add `DreamSchedulerOptions`, `DreamSchedulerStatus`, `DreamScheduler`, and `createDreamScheduler`.

- [x] **Step 2: Export scheduler API**

Export `createDreamScheduler`, `defaultDreamSchedulerIntervalMs`, and scheduler types from the daemon package index.

- [x] **Step 3: Verify targeted tests**

Run: `bun test apps/daemon/src/scheduler.test.ts`

Expected: PASS.

### Task 3: Verify and Commit

- [x] **Step 1: Run full gates**

Run lint, typecheck, test, and build for `the-agent`.

- [x] **Step 2: Update audits and memory copies**

Record the daemon scheduler slice and updated verification evidence.

- [x] **Step 3: Commit**

Commit with `git commit -m "feat: add daemon dream scheduler"`.

## Self-Review

- Spec coverage: scheduler loop, injected timers, status, exports, and tests are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: scheduler API names match the implementation.
