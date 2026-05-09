# SQLite Migrations Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace inline SQLite table creation with explicit, idempotent migration artifacts.

**Architecture:** Keep SQL migrations near existing storage schema code. `SQLiteStateRepository` delegates initialization to `runMigrations`.

**Tech Stack:** Bun test, TypeScript ESM, `bun:sqlite`.

---

### Task 1: Migration Test

**Files:**
- Create: `packages/state/src/storage/migrations.test.ts`

- [ ] Write a failing test that runs migrations twice and checks expected tables/version row.
- [ ] Run the test and confirm missing runner failure.

### Task 2: Migration Runner

**Files:**
- Create: `packages/state/src/storage/migrations/0001_initial.sql`
- Create: `packages/state/src/storage/migrations.ts`
- Modify: `packages/state/src/sqlite-repository.ts`

- [ ] Implement migration SQL.
- [ ] Implement idempotent runner.
- [ ] Wire repository constructor to the runner.
- [ ] Run full gates and commit.
