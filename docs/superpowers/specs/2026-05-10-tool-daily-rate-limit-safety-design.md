# Tool Daily Rate-Limit Safety Design

## Goal

Close the local Phase 1 pre-action safety gap for per-day external tool caps.

## Scope

- Extend dispatcher rate-limit config with `perDay` caps.
- Add an injected daily usage counter interface so the dispatcher stays independent of the state package.
- Evaluate daily limits before adapter dispatch and emit blocked dispatch events when a cap is exceeded.
- Add in-memory and SQLite-backed daily tool usage counters to `StateRepository`.
- Add a versioned SQLite migration for durable `tool_usage` counts.
- Keep per-day buckets keyed by UTC `YYYY-MM-DD`.

## Non-Goals

- No distributed locking across machines.
- No per-domain or per-credential counters.
- No automatic configuration loading from agent config yet.
- No deletion or pruning policy for historical usage rows.

## Testing

Dispatcher tests verify daily caps block across dispatcher instances that share the same usage store. State tests verify in-memory counts, SQLite persistence across repository instances, and migration creation of the `tool_usage` table.
