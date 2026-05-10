# CLI Dispatcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a testable CLI argv dispatcher and executable package entrypoint.

**Architecture:** Keep command helpers as the business logic boundary. Add `apps/cli/src/dispatcher.ts` to parse argv into helper calls and return structured results plus JSON output; have `apps/cli/src/index.ts` call the dispatcher only when run as the CLI entrypoint.

**Tech Stack:** Bun, TypeScript, `bun:test`.

---

### Task 1: Failing Dispatcher Tests

**Files:**
- Create: `apps/cli/src/dispatcher.test.ts`

- [x] **Step 1: Write failing tests**

Add tests for `status`, `doctor`, `init`, `skills list`, `world search`, `run`, `credentials add`, `credentials list`, and unknown command errors.

- [x] **Step 2: Verify red**

Run: `bun test apps/cli/src/dispatcher.test.ts`

Expected: FAIL because `apps/cli/src/dispatcher.ts` does not exist.

### Task 2: Implement Dispatcher

**Files:**
- Create: `apps/cli/src/dispatcher.ts`
- Modify: `apps/cli/src/index.ts`

- [x] **Step 1: Add parser and router**

Parse `--flag value` and boolean flags, route command families to the existing helpers, and return `{ command, result, output }`.

- [x] **Step 2: Add executable entrypoint behavior**

When `index.ts` is run directly, dispatch `Bun.argv.slice(2)`, write JSON output to stdout, and write usage errors to stderr.

- [x] **Step 3: Verify targeted tests**

Run: `bun test apps/cli/src/dispatcher.test.ts`

Expected: PASS.

### Task 3: Verify and Commit

- [x] **Step 1: Run full gates**

Run lint, typecheck, test, and build for `the-agent`.

- [x] **Step 2: Update audits and memory copies**

Record the CLI dispatcher slice and updated verification evidence.

- [x] **Step 3: Commit**

Commit with `git commit -m "feat: add cli dispatcher"`.

## Self-Review

- Spec coverage: parser, routed commands, JSON entrypoint, explicit paths, and tests are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: public dispatcher API is `dispatchCliCommand(argv)`.
