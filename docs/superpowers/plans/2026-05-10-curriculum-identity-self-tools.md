# Curriculum And Identity Self-Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill the named curriculum and identity self-tools from `goal.md`.

**Architecture:** Extend `SelfTools` with curriculum read/progress methods and an identity group. Use local world curriculum files for curriculum reads, existing curriculum progress state for progress, current identity state for summary/stage, and recent run records for history.

**Tech Stack:** TypeScript, Bun, `bun:test`.

---

### Task 1: Failing Self-Tool Test

**Files:**
- Modify: `packages/tools/src/builtin/self-tools.test.ts`

- [x] **Step 1: Seed curriculum and identity state**

Create a temp world with `domains/coding/curriculum.md`, seed current identity, and create one completed run.

- [x] **Step 2: Assert named tools**

Assert `curriculum.read`, `curriculum.progress`, `identity.summary`, `identity.stage`, and `identity.history` return the expected values.

- [x] **Step 3: Verify red**

Run: `bun test packages/tools/src/builtin/self-tools.test.ts`

Expected: FAIL because `curriculum.read` and `identity` are missing.

### Task 2: Implement Curriculum And Identity Tools

**Files:**
- Modify: `packages/tools/src/builtin/self-tools.ts`

- [x] **Step 1: Add tool result types**

Add identity history and attention-adjacent self-tool result types as needed.

- [x] **Step 2: Extend `SelfTools`**

Add `curriculum.read`, `curriculum.progress`, and the `identity` group.

- [x] **Step 3: Back tools with local state**

Read curriculum markdown from the primary local world root, read progress and identity from the state repository, and summarize recent runs for identity history.

- [x] **Step 4: Verify focused tests**

Run: `bun test packages/tools/src/builtin/self-tools.test.ts`

Expected: PASS.

### Task 3: Verify and Commit

- [x] **Step 1: Run agent gates**

Run lint, typecheck, test, build, format check, and `git diff --check` in `the-agent`.

- [x] **Step 2: Update audit**

Record curriculum and identity self-tool coverage in the active completion audit.

- [x] **Step 3: Commit**

Commit with `git commit -m "feat(tools): add curriculum identity self-tools"`.

## Self-Review

- Spec coverage: every named curriculum and identity tool from `goal.md` is covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: new methods use existing state repository shapes and branded IDs only at storage boundaries.
