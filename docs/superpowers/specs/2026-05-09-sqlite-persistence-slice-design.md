# SQLite Persistence Slice Design

## Context

The roadmap calls for SQLite-backed state. The current Phase 1-3 implementation uses `InMemoryStateRepository`, which is useful for deterministic tests but does not survive process restarts. The next unblocked production step is a durable repository with the same behavior contract.

## Approach

Add `SQLiteStateRepository` beside the in-memory repository. It uses Bun's built-in `bun:sqlite` module to avoid adding native package risk while preserving the same domain-facing methods:

- run create/update/get/list
- episode append/list
- confidence bucket updates/listing
- curriculum progress updates
- local skill upsert/list
- identity set/get
- publishable artifact queue/list

The repository initializes its own schema on construction and serializes typed payloads as JSON where Phase 3 does not yet require queryable columns. It is intentionally small and replaceable: later Drizzle/better-sqlite3 work can migrate the same tables and tests.

## Success Criteria

- A SQLite repository created at a file path persists runs and episodes after being closed and reopened.
- Confidence, curriculum, skills, identity, and publishable artifacts persist across repository instances.
- Existing in-memory tests continue to pass.
- Full `the-agent` gates pass.
