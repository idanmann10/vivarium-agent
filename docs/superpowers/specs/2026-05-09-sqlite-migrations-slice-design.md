# SQLite Migrations Slice Design

## Context

The SQLite repository currently initializes tables directly in code. The roadmap calls for migrations. Before choosing Drizzle/better-sqlite3, the project can still gain explicit migration artifacts and a migration runner over the existing `bun:sqlite` persistence base.

## Approach

Add:

- `packages/state/src/storage/migrations/0001_initial.sql`
- `packages/state/src/storage/migrations.ts`
- a `schema_migrations` table
- a migration runner used by `SQLiteStateRepository`

The migration runner is deterministic, idempotent, and testable against a temporary SQLite database.

## Success Criteria

- Migration test verifies tables are created and migration version is recorded.
- Re-running migrations does not duplicate version rows or fail.
- `SQLiteStateRepository` uses the migration runner.
- Full `the-agent` gates pass.
