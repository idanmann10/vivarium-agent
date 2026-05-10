# Episode Self-Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the named episode self-tools from `goal.md`.

**Architecture:** Implement the named tools as small wrappers over the existing typed episode stream. Generate deterministic local episode IDs from the run ID and current episode count.

**Tech Stack:** TypeScript, Bun, `bun:test`.

---

### Task 1: Failing Episode Self-Tool Test

**Files:**
- Modify: `packages/tools/src/builtin/self-tools.test.ts`

- [x] **Step 1: Seed a run**

Create a local run with an agent ID and no episodes.

- [x] **Step 2: Call named episode tools**

Call `episodes.note(...)`, `episodes.surprise(...)`, and `episodes.recallRun(...)`.

- [x] **Step 3: Verify red**

Run: `bun test packages/tools/src/builtin/self-tools.test.ts`

Expected: FAIL because `episodes.note` is missing.

### Task 2: Implement Episode Tools

**Files:**
- Modify: `packages/tools/src/builtin/self-tools.ts`

- [x] **Step 1: Add request/result types**

Add note, surprise, and write-result shapes.

- [x] **Step 2: Extend `SelfTools.episodes`**

Add `note`, `surprise`, and `recallRun` methods.

- [x] **Step 3: Append typed episodes**

Write `observation` and `surprise` episode records with generated IDs and timestamps.

- [x] **Step 4: Verify focused test**

Run: `bun test packages/tools/src/builtin/self-tools.test.ts`

Expected: PASS.

### Task 3: Reference Docs

**Files:**
- Modify: `scripts/reference-docs.test.ts`
- Modify: `docs/reference/tools/episodes.md`

- [x] **Step 1: Add docs method gate**

Require `note(request)`, `surprise(request)`, and `recallRun(runId)` in `episodes.md`.

- [x] **Step 2: Verify red**

Run: `bun test scripts/reference-docs.test.ts`

Expected: FAIL because `episodes.md` lacks the named methods.

- [x] **Step 3: Update docs**

Document each named episode method.

- [x] **Step 4: Verify docs test**

Run: `bun test scripts/reference-docs.test.ts`

Expected: PASS.

### Task 4: Verify and Commit

- [x] **Step 1: Run agent gates**

Run lint, typecheck, test, build, format check, and `git diff --check` in `the-agent`.

- [x] **Step 2: Update audit**

Record episode self-tool and reference-doc coverage in the active completion audit.

- [x] **Step 3: Commit**

Commit with `git commit -m "feat(tools): add episode self-tools"`.

## Self-Review

- Spec coverage: note, surprise, recall, docs, and tests are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: new tools append existing `observation` and `surprise` episode types.
