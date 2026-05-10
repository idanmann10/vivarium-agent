# Init Newborn Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist a newborn identity record during local init.

**Architecture:** Keep the behavior in `apps/cli/src/commands/init.ts`, where the state repository is already opened for migrations, starter skill installation, and curriculum progress. Use the existing `Identity` shape and `agentId` helper.

**Tech Stack:** TypeScript, Bun, SQLite state repository, `bun:test`.

---

### Task 1: Failing Init State Test

**Files:**
- Modify: `apps/cli/src/commands/init.test.ts`

- [x] **Step 1: Assert identity state after init**

After opening `SQLiteStateRepository`, assert `state.getIdentity()` matches `name: "local-agent"`, `devStages: { coding: "newborn" }`, and `runsCompleted: 0`.

- [x] **Step 2: Verify red**

Run: `bun test apps/cli/src/commands/init.test.ts`

Expected: FAIL because `state.getIdentity()` is undefined before the implementation.

### Task 2: Persist Initial Identity

**Files:**
- Modify: `apps/cli/src/commands/init.ts`

- [x] **Step 1: Import `agentId`**

Import `agentId` from the existing core exports alongside `skillId`.

- [x] **Step 2: Set current identity**

Call `state.setIdentity` after starter skills and curriculum progress are written. Use `agentId("local-agent")`, `name: "local-agent"`, `devStages: { [primaryDomain]: "newborn" }`, `runsCompleted: 0`, a concise newborn summary, and `updatedAt: "local"`.

- [x] **Step 3: Verify focused test**

Run: `bun test apps/cli/src/commands/init.test.ts`

Expected: PASS.

### Task 3: Verify and Commit

- [x] **Step 1: Run agent gates**

Run lint, typecheck, test, build, format check, and `git diff --check` in `the-agent`.

- [x] **Step 2: Update audit**

Record newborn identity initialization in the active completion audit.

- [x] **Step 3: Commit**

Commit with `git commit -m "feat(init): persist newborn identity"`.

## Self-Review

- Spec coverage: identity persistence, selected domain newborn stage, deterministic local name, and SQLite verification are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: implementation uses the existing `Identity` fields and `StateRepository.setIdentity`.
