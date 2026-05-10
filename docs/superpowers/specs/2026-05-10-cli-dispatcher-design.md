# CLI Dispatcher Design

## Goal

Close the local CLI parser gap by turning the CLI package entrypoint into a real command dispatcher for the roadmap's local commands.

## Scope

- Add `dispatchCliCommand(argv)` for testable argv parsing.
- Route `init`, `run`, `credentials add/list`, `skills list`, `world search`, `status`, and `doctor`.
- Emit structured JSON output from the executable package entrypoint.
- Keep existing command helper functions unchanged.
- Require explicit filesystem paths for state, world, and credential commands in dispatcher tests.

## Non-Goals

- No interactive prompt loop.
- No shell completion generation.
- No live provider or GitHub credential flow.
- No command aliases beyond the documented local command names.

## Testing

Dispatcher tests cover all routed command families, explicit path handling, and usage errors for unsupported commands. Existing command-helper tests continue to cover command internals.
