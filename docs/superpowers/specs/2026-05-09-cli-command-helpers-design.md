# CLI Command Helpers Design

## Goal

Fill the remaining Phase 1 CLI helper gap by adding non-interactive command helpers for credentials, skills, and world search.

## Scope

- Add credential command helpers backed by the encrypted file credential store.
- Add skill listing helpers backed by `SQLiteStateRepository`.
- Add world search helpers backed by the local world reader.
- Export the helpers from `apps/cli/src/index.ts`.

## Non-Goals

- No argument parser or terminal UI.
- No interactive secret prompt.
- No GitHub pull/fetch command yet.

## Testing

Focused tests use temp credentials, temp SQLite state, and temp world fixtures to verify each helper returns structured output.
