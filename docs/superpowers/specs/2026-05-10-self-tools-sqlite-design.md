# Self-Tools SQLite Design

## Goal

Close the local Phase 1 self-tools gap by making built-in self-tools work against the shared state repository shape, including SQLite-backed state, and by exposing the roadmap self-tool groups beyond runs and episodes.

## Scope

- Add a `StateRepository` interface covering the existing in-memory and SQLite repository methods.
- Type both repositories against that interface.
- Change `createSelfTools` to accept `StateRepository`.
- Add local self-tool groups for memory, skills, anti-pattern candidates, trace candidates, run search/read, episodes, world search, curriculum, and confidence.
- Keep existing orchestrator/runtime call sites compatible.

## Non-Goals

- No destructive memory deletion; `memory.forget` remains a no-op false result.
- No live credential or provider-backed self-tool calls.
- No GitHub world writes from self-tools.
- No trace rendering beyond local candidate records.

## Testing

Self-tool tests verify existing in-memory behavior and SQLite-backed memory write, skill use accounting, anti-pattern candidate flagging, and trace candidate authoring.
