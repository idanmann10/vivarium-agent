# Web External Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add typed web external tool requests and adapter routing.

**Architecture:** Extend the existing external router and dispatcher parser. Keep all network/search work dependency-injected for local tests.

**Tech Stack:** Bun, TypeScript, `bun:test`.

---

### Task 1: Web Router Tests

**Files:**
- Modify: `packages/tools/src/external/index.test.ts`
- Modify: `packages/tools/src/dispatcher.test.ts`

- [ ] **Step 1: Write failing tests**

Verify `web.fetch`, `web.read`, and `web.search` route through injected adapters.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/tools/src/external/index.test.ts packages/tools/src/dispatcher.test.ts`

### Task 2: Implement Web Requests

**Files:**
- Modify: `packages/tools/src/external/index.ts`
- Modify: `packages/tools/src/dispatcher.ts`
- Modify: `packages/tools/src/index.ts`

- [ ] **Step 1: Add types and adapter fields**

Add web request variants and `searchWeb`.

- [ ] **Step 2: Route requests**

Use injected fetch for `web.fetch`/`web.read` and injected search for `web.search`.

### Task 3: Verify and Commit

Run full gates, update audits/memory, and commit with `git commit -m "feat: add web external tools"`.

## Self-Review

- Spec coverage: fetch, read, search, dispatcher parsing, and tests are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: public names are `web.fetch`, `web.read`, and `web.search`.
