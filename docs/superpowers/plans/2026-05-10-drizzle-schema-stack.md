# Drizzle Schema Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Drizzle schema artifacts and stack dependencies while preserving the supported Bun SQLite runtime path.

**Architecture:** Install the roadmap's Drizzle/better-sqlite3 packages, but keep `SQLiteStateRepository` on `bun:sqlite` because Bun rejects direct `better-sqlite3` loading. Add `packages/state/src/storage/drizzle-schema.ts` as the type-safe schema artifact and keep it synchronized with the migration table manifest.

**Tech Stack:** TypeScript, Bun test, Drizzle ORM, better-sqlite3 dependency, `bun:sqlite` execution path.

---

### Task 1: Failing Storage Tests

**Files:**
- Modify: `packages/state/src/storage/migrations.test.ts`
- Create: `packages/state/src/storage/drizzle-schema.test.ts`

- [x] **Step 1: Try better-sqlite3 migration execution**

Switch the migration test to better-sqlite3 and run it.

- [x] **Step 2: Record blocker**

Result: FAIL. Bun reports `'better-sqlite3' is not yet supported in Bun`.

- [x] **Step 3: Add Drizzle schema coverage test**

Add a test that imports `stateDrizzleTableNames` and `stateDrizzleTables` and compares them to `storageTables`.

### Task 2: Add Drizzle Schema

**Files:**
- Create: `packages/state/src/storage/drizzle-schema.ts`
- Modify: `packages/state/src/storage/schema.ts`
- Modify: `package.json`
- Modify: `bun.lock`

- [x] **Step 1: Add dependencies**

Install `better-sqlite3`, `drizzle-orm`, `@types/better-sqlite3`, and `drizzle-kit`.

- [x] **Step 2: Keep supported migration runtime**

Return `migrations.test.ts` to `bun:sqlite` so the current test runner remains executable.

- [x] **Step 3: Define Drizzle tables**

Mirror the actual migration-created runtime tables in `drizzle-schema.ts`.

- [x] **Step 4: Synchronize storage table manifest**

Update `storageTables` to match runtime tables created by migrations.

- [x] **Step 5: Verify focused tests**

Run: `bun test packages/state/src/storage/migrations.test.ts packages/state/src/storage/drizzle-schema.test.ts`

Expected: PASS.

### Task 3: Verify, Audit, and Commit

- [x] **Step 1: Run full agent gates**

Run lint, typecheck, test, and build for `the-agent`.

- [x] **Step 2: Update audits and memory copies**

Record Drizzle schema coverage and the Bun better-sqlite3 blocker.

- [x] **Step 3: Commit**

Commit with `git commit -m "feat: add drizzle state schema"`.

## Self-Review

- Spec coverage: dependencies, Drizzle schema, storage manifest sync, and better-sqlite3 blocker are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: table manifest and schema names are tested together.
