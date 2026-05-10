# Dream Candidate Generation Design

## Goal

Close the local Phase 2 gap for anti-pattern and trace candidate generation by having Dream inspect run history, create deterministic candidates, and persist those candidates in memory and SQLite state.

## Scope

- Add persistent anti-pattern and trace candidate queues to the state repository.
- Add a versioned SQLite migration for persisted Dream candidates.
- Generate anti-pattern candidates from failed or low-score runs.
- Generate trace candidates with annotated steps from successful high-score runs.
- Return generated candidate IDs from `runDream`.

## Non-Goals

- No LLM-authored candidate prose.
- No GitHub publication from the candidate queue.
- No live nightly scheduler loop.
- No duplicate-detection beyond deterministic candidate IDs.

## Testing

Repository tests cover in-memory candidate storage and SQLite persistence. Migration tests cover the new table/version. Dream primitive tests cover anti-pattern extraction from failure and annotated trace extraction from success.
