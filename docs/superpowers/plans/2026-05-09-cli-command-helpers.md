# CLI Command Helpers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add credentials, skills, and world command helpers for the CLI package.

**Architecture:** Keep command helpers thin and non-interactive. Credentials delegate to encrypted credential storage, skills delegate to SQLite state, and world search delegates to the local world reader.

**Tech Stack:** Bun, TypeScript, `bun:test`, existing state/tools/world packages.

---

### Task 1: Command Tests

**Files:**
- Create: `apps/cli/src/commands/credentials.test.ts`
- Create: `apps/cli/src/commands/skills.test.ts`
- Create: `apps/cli/src/commands/world.test.ts`

- [ ] **Step 1: Write failing tests**

Verify credential add/list, skill listing from SQLite, and local world search.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test apps/cli/src/commands/credentials.test.ts apps/cli/src/commands/skills.test.ts apps/cli/src/commands/world.test.ts`

### Task 2: Implement Helpers

**Files:**
- Create: `apps/cli/src/commands/credentials.ts`
- Create: `apps/cli/src/commands/skills.ts`
- Create: `apps/cli/src/commands/world.ts`
- Modify: `apps/cli/src/index.ts`

- [ ] **Step 1: Implement helpers**

Add typed option/result interfaces and minimal command functions.

- [ ] **Step 2: Export helpers**

Export functions and types from the CLI package index.

### Task 3: Verify and Commit

Run full gates, update audits/memory, and commit with `git commit -m "feat: add cli command helpers"`.

## Self-Review

- Spec coverage: credentials, skills, world, exports, and tests are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: command names match the roadmap command names.
