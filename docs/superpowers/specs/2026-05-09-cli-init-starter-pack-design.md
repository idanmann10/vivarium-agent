# CLI Init Starter Pack Design

## Goal

Make CLI init do useful local bootstrap work: run SQLite migrations, discover starter-pack world artifacts for the chosen primary domain, install starter skills locally, and return the remaining provider/credential prompts.

## Scope

- Keep `describeInitCommand` for lightweight CLI descriptions.
- Add `runInitCommand` as a pure-ish command helper with explicit `worldRoot` and `statePath`.
- Use the local world reader to discover starter skills and traces.
- Read starter skill bodies and store them as promoted local skills in SQLite.
- Return an init summary containing primary domain, state path, starter skills, starter traces, curriculum path, migration versions, and prompts.

## Non-Goals

- No interactive prompts in this slice.
- No GitHub identity binding implementation beyond reporting that the prompt is required.
- No provider file writing yet.
- No trace persistence schema yet.

## Testing

Tests create a temp world with two skills, one trace, and a curriculum, run init against a temp SQLite path, then reopen the repository and verify starter skills were installed and migrations ran.
