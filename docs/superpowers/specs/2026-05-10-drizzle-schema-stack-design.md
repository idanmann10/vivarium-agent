# Drizzle Schema Stack Design

## Goal

Align the state package more closely with the roadmap's Drizzle + better-sqlite3 stack without breaking the current Bun runtime.

## Scope

- Add Drizzle and better-sqlite3 package dependencies.
- Add Drizzle table definitions for every runtime state storage table.
- Keep the existing `bun:sqlite` repository execution path because Bun 1.3.11 cannot load `better-sqlite3`.
- Update the storage table manifest to match the actual migration-created tables.

## Non-Goals

- No direct better-sqlite3 execution under Bun until the runtime supports the native module.
- No rewrite of `SQLiteStateRepository` away from `bun:sqlite` in this slice.
- No migration generation from Drizzle Kit.

## Test Strategy

- Focused storage tests verify migration idempotency and Drizzle table coverage.
- Full lint, typecheck, test, and build gates verify the dependency and schema additions do not break the current runtime.
