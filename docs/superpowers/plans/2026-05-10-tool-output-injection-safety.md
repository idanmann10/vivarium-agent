# Tool Output Injection Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface prompt-injection warnings from successful external tool outputs.

**Architecture:** Keep the dispatcher as the safety boundary for external tool calls. Add a deterministic scanner to `packages/tools/src/safety/pipeline.ts`, call it from `fromExternalResult`, attach warnings to successful tool dispatch results, and expose the warnings through dispatch events.

**Tech Stack:** Bun, TypeScript, `bun:test`.

---

### Task 1: Failing Dispatcher Test

**Files:**
- Modify: `packages/tools/src/dispatcher.test.ts`

- [x] **Step 1: Write failing output-warning test**

Add a `web.read` test whose fetched page says "Ignore previous instructions" and assert the dispatch result and event include a prompt-injection warning.

- [x] **Step 2: Verify red**

Run: `bun test packages/tools/src/dispatcher.test.ts`

Expected: FAIL because dispatcher results do not include output warnings.

### Task 2: Implement Output Scanner

**Files:**
- Modify: `packages/tools/src/safety/pipeline.ts`
- Modify: `packages/tools/src/safety/pipeline.test.ts`
- Modify: `packages/tools/src/dispatcher.ts`

- [x] **Step 1: Add scanner and tests**

Add `scanToolOutputForPromptInjection` with deterministic phrase patterns and focused tests.

- [x] **Step 2: Thread warnings through dispatcher**

Add optional `warnings` to successful `ToolDispatchResult`, scan successful external values, and surface joined warnings in dispatch events.

- [x] **Step 3: Verify targeted tests**

Run: `bun test packages/tools/src/dispatcher.test.ts packages/tools/src/safety/pipeline.test.ts`

Expected: PASS.

### Task 3: Verify and Commit

- [x] **Step 1: Run full gates**

Run lint, typecheck, test, and build for `the-agent`.

- [x] **Step 2: Update audits and memory copies**

Record the tool-output injection safety slice and updated verification evidence.

- [x] **Step 3: Commit**

Commit with `git commit -m "feat: warn on prompt injection outputs"`.

## Self-Review

- Spec coverage: scanner, dispatcher warnings, event surfacing, non-blocking behavior, and tests are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: successful `ToolDispatchResult` has optional `warnings`.
