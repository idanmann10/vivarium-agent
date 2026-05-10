# Computer-Use Confirmation Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local dispatcher safety for system-level `computer.click` and `computer.type` actions.

**Architecture:** Extend the typed external tool router with computer-use request shapes and an injected `ComputerUseAdapter`. Keep confirmation decisions in the safety pipeline and enforce them from `createToolDispatcher` before adapter dispatch.

**Tech Stack:** Bun, TypeScript, `bun:test`.

---

### Task 1: Failing Computer-Use Tests

**Files:**
- Modify: `packages/tools/src/external/index.test.ts`
- Modify: `packages/tools/src/dispatcher.test.ts`
- Modify: `packages/tools/src/safety/pipeline.test.ts`

- [x] **Step 1: Add external adapter routing test**

Add a test proving `dispatchExternalTool` routes `computer.screenshot`, `computer.click`, `computer.type`, `computer.scroll`, `computer.list_windows`, and `computer.focus_window` through an injected computer-use adapter.

- [x] **Step 2: Add dispatcher confirmation tests**

Add tests proving unconfirmed `computer.click` with `systemLevel: true` blocks, confirmed clicks dispatch, and unconfirmed `computer.type` into a password field blocks.

- [x] **Step 3: Add safety pipeline tests**

Add direct tests for `evaluateComputerUseSafety` covering `system_only`, `always`, and `never` confirmation levels.

- [x] **Step 4: Verify red**

Run: `bun test packages/tools/src/external/index.test.ts packages/tools/src/dispatcher.test.ts packages/tools/src/safety/pipeline.test.ts`

Expected: FAIL because computer-use request parsing, adapter routing, and confirmation safety do not exist.

### Task 2: Implement Computer-Use Routing

**Files:**
- Modify: `packages/tools/src/external/index.ts`
- Modify: `packages/tools/src/index.ts`

- [x] **Step 1: Add computer-use request types**

Add typed request shapes for screenshot, click, type, scroll, list windows, and focus window.

- [x] **Step 2: Add adapter interface**

Add `ComputerUseAdapter` with methods matching the request names and include it on `ExternalToolAdapters`.

- [x] **Step 3: Route adapter calls**

Add `dispatchExternalTool` branches that return `Missing external adapter for <name>` when the adapter is absent and call the adapter when present.

### Task 3: Implement Confirmation Safety

**Files:**
- Modify: `packages/tools/src/safety/pipeline.ts`
- Modify: `packages/tools/src/dispatcher.ts`

- [x] **Step 1: Add safety evaluator**

Add `evaluateComputerUseSafety` with confirmation levels `always`, `system_only`, and `never`.

- [x] **Step 2: Parse computer-use dispatcher requests**

Parse `computer.*` tool names into typed external requests.

- [x] **Step 3: Enforce click/type confirmation**

Before adapter dispatch, call `evaluateComputerUseSafety` for `computer.click` and `computer.type`; return a blocked dispatch result on failed confirmation.

### Task 4: Verify, Audit, and Commit

- [x] **Step 1: Verify focused tests**

Run: `bun test packages/tools/src/external/index.test.ts packages/tools/src/dispatcher.test.ts packages/tools/src/safety/pipeline.test.ts`

Expected: PASS.

- [x] **Step 2: Run full gates**

Run lint, typecheck, test, and build for `the-agent`.

- [x] **Step 3: Update audits and memory copies**

Record the computer-use confirmation safety slice and updated verification evidence.

- [x] **Step 4: Commit**

Commit with `git commit -m "feat: add computer use confirmation safety"`.

## Self-Review

- Spec coverage: request types, adapter routing, confirmation policy, tests, and non-goals are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: the confirmation function is `evaluateComputerUseSafety`.
