# State Memory Implementations Design

## Goal

Make `packages/state/src/memory/` contain usable implementations for the five roadmap memory systems instead of configuration-only stubs.

## Scope

- Keep `StateRepository` as the persistence boundary.
- Add semantic fact deletion so `memory.forget(id)` can work locally and in SQLite.
- Add thin memory modules for working, episodic, semantic, procedural, and identity memory.
- Export memory factories from `packages/state/src/memory/index.ts`.
- Route self-tool `memory.forget` through the repository deletion path.

## Non-Goals

- No production stack migration from `bun:sqlite` to another SQLite library.
- No advanced semantic ranking beyond the current deterministic text match.
- No filesystem synchronization for procedural skills.

## Test Strategy

- Add repository tests for semantic fact deletion in memory and SQLite repositories.
- Add memory-module tests covering working memory caps and repository-backed episodic, semantic, procedural, and identity behavior.
- Add self-tool coverage that `memory.forget(id)` removes a persisted semantic fact.
