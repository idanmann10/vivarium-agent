# Tool Rate-Limit and Credential Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dispatcher-level per-run rate limits and embedded credential argument blocking.

**Architecture:** Keep `createToolDispatcher` as the external tool safety boundary. Add a per-dispatcher counter map keyed by tool name and a deterministic credential-like argument scanner in the safety pipeline.

**Tech Stack:** Bun, TypeScript, `bun:test`.

---

### Task 1: Failing Safety Tests

**Files:**
- Modify: `packages/tools/src/dispatcher.test.ts`

- [x] **Step 1: Write failing tests**

Add tests proving the dispatcher blocks a second call when `rateLimits.perRun` is exceeded and blocks external tool args containing `Bearer ...` text.

- [x] **Step 2: Verify red**

Run: `bun test packages/tools/src/dispatcher.test.ts`

Expected: FAIL because rate limits and embedded credential blocking do not exist.

### Task 2: Implement Guards

**Files:**
- Modify: `packages/tools/src/safety/pipeline.ts`
- Modify: `packages/tools/src/safety/pipeline.test.ts`
- Modify: `packages/tools/src/dispatcher.ts`

- [x] **Step 1: Add credential detector**

Add `containsEmbeddedCredential` with tests for bearer and API-key-like strings.

- [x] **Step 2: Add per-run rate limits**

Add `ToolRateLimitConfig`, track dispatcher-local counts, and block calls past the configured limit.

- [x] **Step 3: Block embedded credential args**

Scan parsed external args before adapter dispatch and return a blocked result when a credential-like string appears.

- [x] **Step 4: Verify targeted tests**

Run: `bun test packages/tools/src/dispatcher.test.ts packages/tools/src/safety/pipeline.test.ts`

Expected: PASS.

### Task 3: Verify and Commit

- [x] **Step 1: Run full gates**

Run lint, typecheck, test, and build for `the-agent`.

- [x] **Step 2: Update audits and memory copies**

Record the tool rate/credential safety slice and updated verification evidence.

- [x] **Step 3: Commit**

Commit with `git commit -m "feat: add tool rate and credential safety"`.

## Self-Review

- Spec coverage: rate limits, credential detection, dispatcher blocking, tests, and non-goals are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: rate-limit config is `ToolRateLimitConfig`.
