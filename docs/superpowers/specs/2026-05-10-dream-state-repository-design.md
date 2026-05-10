# Dream State Repository Design

## Goal

Close the local Phase 2 Dream primitive gap by making `runDream` operate on the shared `StateRepository` interface instead of only the in-memory repository class.

## Scope

- Change Dream request typing from `InMemoryStateRepository` to `StateRepository`.
- Keep current Dream behavior unchanged.
- Add a SQLite-backed Dream test proving candidate generation persists through the durable repository implementation.

## Non-Goals

- No new Dream heuristics.
- No provider-backed Dream implementation.
- No scheduling changes.

## Testing

Typecheck should accept `SQLiteStateRepository` as Dream state. Focused Dream tests verify existing in-memory behavior and SQLite-backed candidate persistence.
