# Tool Daily Rate-Limit Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent per-day external tool rate limits at the dispatcher safety boundary.

**Architecture:** Keep `createToolDispatcher` as the external tool safety boundary. The dispatcher accepts `rateLimits.perDay`, a `dailyUsage` counter, and an optional `now` clock; `StateRepository` implements the counter with in-memory maps and a SQLite `tool_usage` table.

**Tech Stack:** Bun, TypeScript, `bun:test`, `bun:sqlite`.

---

### Task 1: Failing Daily-Limit Tests

**Files:**
- Modify: `packages/tools/src/dispatcher.test.ts`
- Modify: `packages/state/src/repository.test.ts`
- Modify: `packages/state/src/sqlite-repository.test.ts`
- Modify: `packages/state/src/storage/migrations.test.ts`

- [x] **Step 1: Add dispatcher daily-limit test**

Add a test that creates two dispatcher instances with the same daily usage store and `rateLimits.perDay: { "web.search": 1 }`. The first call succeeds; the second call blocks with `Daily rate limit exceeded for web.search`.

- [x] **Step 2: Add state persistence tests**

Add tests proving `InMemoryStateRepository.incrementToolUsage` increments by day, `SQLiteStateRepository` persists tool usage across repository instances, and migrations create `tool_usage` with `0004_tool_usage` recorded.

- [x] **Step 3: Verify red**

Run: `bun test packages/tools/src/dispatcher.test.ts packages/state/src/repository.test.ts packages/state/src/sqlite-repository.test.ts packages/state/src/storage/migrations.test.ts`

Expected: FAIL because daily usage APIs, migration, and dispatcher per-day checks do not exist.

### Task 2: Implement Daily Usage Storage

**Files:**
- Modify: `packages/state/src/repository.ts`
- Modify: `packages/state/src/sqlite-repository.ts`
- Modify: `packages/state/src/storage/schema.ts`
- Modify: `packages/state/src/storage/migrations.ts`
- Create: `packages/state/src/storage/migrations/0004_tool_usage.sql`
- Modify: `packages/state/src/index.ts`

- [x] **Step 1: Add tool usage types and in-memory methods**

Add `ToolUsageRecord`, `incrementToolUsage(toolName, day)`, and `getToolUsageCount(toolName, day)` to the repository interface and in-memory implementation.

- [x] **Step 2: Add SQLite migration**

Create `tool_usage` with primary key `(tool_name, day)` and record migration version `0004_tool_usage`.

- [x] **Step 3: Add SQLite methods**

Implement `incrementToolUsage` with an upsert and `getToolUsageCount` with a point lookup.

### Task 3: Implement Dispatcher Daily Limits

**Files:**
- Modify: `packages/tools/src/dispatcher.ts`
- Modify: `packages/tools/src/index.ts`

- [x] **Step 1: Add daily usage interface**

Add a structural `ToolDailyUsageCounter` interface with `incrementToolUsage(toolName, day)` and `getToolUsageCount(toolName, day)`.

- [x] **Step 2: Add per-day limit config**

Extend `ToolRateLimitConfig` with `perDay`, `dailyUsage`, and `now`.

- [x] **Step 3: Block daily overages**

Compute the UTC day from `now`, increment usage through the shared counter, and return `{ ok: false, error: "Daily rate limit exceeded for <tool>", blocked: true }` when the incremented count exceeds the configured cap.

### Task 4: Verify, Audit, and Commit

- [x] **Step 1: Verify focused tests**

Run: `bun test packages/tools/src/dispatcher.test.ts packages/state/src/repository.test.ts packages/state/src/sqlite-repository.test.ts packages/state/src/storage/migrations.test.ts`

Expected: PASS.

- [x] **Step 2: Run full gates**

Run lint, typecheck, test, and build for `the-agent`.

- [x] **Step 3: Update audits and memory copies**

Record the daily rate-limit safety slice and updated verification evidence.

- [x] **Step 4: Commit**

Commit with `git commit -m "feat: add daily tool rate limits"`.

## Self-Review

- Spec coverage: dispatcher daily limits, durable state storage, migration, tests, and non-goals are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: the shared counter methods are `incrementToolUsage` and `getToolUsageCount`.
