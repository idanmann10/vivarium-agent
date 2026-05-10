# CLI Install Flow State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify the local `init` -> `run` CLI flow against one shared SQLite state file.

**Architecture:** Extend `runCommand` with an optional `statePath`. When provided, use `SQLiteStateRepository` and close it after collecting run output; otherwise keep the current in-memory behavior. Extend the dispatcher to pass `--state-path` through for `run`.

**Tech Stack:** TypeScript, Bun test, `bun:sqlite`.

---

### Task 1: Failing E2E Test

**Files:**
- Create: `tests/e2e-cli-install-flow.test.ts`

- [x] **Step 1: Add init-then-run test**

Create a temporary world fixture and state DB. Dispatch `init --state-path <db>`, dispatch `run --state-path <db>`, reopen SQLite, and assert starter skills plus persisted run episodes exist.

- [x] **Step 2: Verify red**

Run: `bun test tests/e2e-cli-install-flow.test.ts`

Expected: FAIL because `run` ignores `--state-path`.

### Task 2: Implement Shared State Run

**Files:**
- Modify: `apps/cli/src/commands/run.ts`
- Modify: `apps/cli/src/dispatcher.ts`

- [x] **Step 1: Add `statePath` option**

Add `statePath?: string` to `RunCommandOptions`.

- [x] **Step 2: Use SQLite when provided**

Use `SQLiteStateRepository` when `statePath` exists; otherwise use `InMemoryStateRepository`. Close SQLite after collecting output.

- [x] **Step 3: Parse `--state-path`**

Forward `--state-path` from the dispatcher `run` case into `runCommand`.

- [x] **Step 4: Verify focused tests**

Run: `bun test tests/e2e-cli-install-flow.test.ts apps/cli/src/dispatcher.test.ts tests/e2e-run.test.ts`

Expected: PASS.

### Task 3: Verify, Audit, and Commit

- [x] **Step 1: Run full agent gates**

Run lint, typecheck, test, and build for `the-agent`.

- [x] **Step 2: Update audits and memory copies**

Record the local CLI install-flow verification and updated test count.

- [x] **Step 3: Commit**

Commit with `git commit -m "feat: run cli goals from initialized state"`.

## Self-Review

- Spec coverage: shared state, dispatcher flag, fallback behavior, and non-goals are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: `statePath` is named consistently across tests, command options, and dispatcher.
