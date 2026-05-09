# CLI Init Starter Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CLI init run local state bootstrap and install starter-pack skills from the world.

**Architecture:** Add `runInitCommand` in `apps/cli/src/commands/init.ts`. It uses `SQLiteStateRepository` for migrations and local skill installation, `createLocalWorldReader` for artifact discovery, and returns a structured summary for future interactive CLI UI.

**Tech Stack:** Bun, TypeScript, `bun:test`, `bun:sqlite`, local world reader.

---

### Task 1: Init Command Test

**Files:**
- Create: `apps/cli/src/commands/init.test.ts`
- Modify: `apps/cli/src/commands/init.ts`

- [ ] **Step 1: Write failing init test**

Create a temp world fixture with a curriculum, two `SKILL.md` files, and one `TRACE.md`. Run init into a temp SQLite path and assert starter skills, traces, curriculum path, migration versions, and prompts are returned.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/cli/src/commands/init.test.ts`

- [ ] **Step 3: Implement `runInitCommand`**

Discover starter artifacts, instantiate `SQLiteStateRepository`, install starter skills, close the DB, and return the summary.

### Task 2: Verify and Commit

- [ ] **Step 1: Run focused CLI/state tests**

Run:

```bash
bun test apps/cli/src/commands/init.test.ts packages/state/src/sqlite-repository.test.ts
```

- [ ] **Step 2: Run full gates**

Run:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

- [ ] **Step 3: Update audits and commit**

Update memory-backed audits, then commit with `git commit -m "feat: add cli init starter pack"`.

## Self-Review

- Spec coverage: migrations, starter skills, starter traces, curriculum, and prompts are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: public function is `runInitCommand`.
