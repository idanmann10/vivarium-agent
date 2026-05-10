# CLI Install Flow State Design

## Goal

Make the local CLI install flow verifiable by letting `run` use the SQLite state file created by `init`.

## Scope

- Add optional `statePath` support to `runCommand`.
- Add `--state-path` parsing for `dispatchCliCommand(["run", ...])`.
- Keep the current in-memory fallback for tests and ad hoc local runs.
- Add an e2e test that runs `init`, then `run`, then inspects the same SQLite state file.

## Non-Goals

- No live provider configuration.
- No live credential use.
- No package installation or global binary wiring.

## Test Strategy

- The new e2e test should fail before implementation because `run` ignores the initialized state path.
- After implementation, the same state DB should contain starter skills from `init` and the persisted run/episodes from `run`.
