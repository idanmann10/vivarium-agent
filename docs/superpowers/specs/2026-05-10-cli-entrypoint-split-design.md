# CLI Entrypoint Split Design

## Context

`goal.md` describes the CLI layout with `apps/cli/src/main.ts` as the commander setup and dispatch entrypoint. The current CLI package does not have that file. Instead, `apps/cli/package.json` exposes `the-agent` through `./src/index.ts`, and `apps/cli/src/index.ts` acts as both the public module export surface and the executable process wrapper through its `import.meta.main` block.

This creates a boundary mismatch: importing the CLI API and running the CLI are currently tied to the same file. The implementation should restore the documented shape while preserving existing command behavior.

## Design

Add `apps/cli/src/main.ts` as the only executable CLI wrapper. It will import `dispatchCliCommand` from `./dispatcher.js`, pass `Bun.argv.slice(2)`, write successful output to `stdout`, write errors to `stderr`, and set `process.exitCode = 1` on failure. This keeps the process-side behavior exactly where package bin execution expects it.

Keep `apps/cli/src/index.ts` as the public API and type export surface. Remove the executable `import.meta.main` block from `index.ts` so importing `@vivarium/cli` has no process side effects and does not depend on Bun runtime globals for normal module use.

Update `apps/cli/package.json` so:

```json
"bin": {
  "the-agent": "./src/main.ts"
}
```

No command behavior, command names, dispatcher semantics, or command output formatting should change as part of this split.

## Components

- `apps/cli/src/main.ts`: process entrypoint only.
- `apps/cli/src/index.ts`: public exports only.
- `apps/cli/src/dispatcher.ts`: remains the dispatch boundary used by both tests and the executable wrapper.
- `apps/cli/package.json`: points the package binary at `main.ts`.

## Data Flow

CLI execution flows from package bin to `main.ts`, then to `dispatchCliCommand(Bun.argv.slice(2))`. The dispatcher returns a `CliDispatchResult` with output. `main.ts` writes that output to `stdout`.

Failures thrown by the dispatcher are handled by `main.ts`: convert the error to a user-facing message, write it with a trailing newline to `stderr`, and set a non-zero exit code. This matches the current behavior in `index.ts`.

Imports flow through `index.ts`. Consumers can import commands, command types, and `CliDispatchResult` without triggering CLI execution.

## Error Handling

`main.ts` should preserve the existing error contract:

- `Error` instances use their `.message`.
- Non-`Error` thrown values produce `Unknown CLI error`.
- Error output is written to `stderr` with a newline.
- `process.exitCode` is set to `1`.

No new error classes or dispatcher behavior are needed.

## Testing

Add a focused regression test for the entrypoint boundary. The test should verify that:

- `apps/cli/package.json` maps `bin["the-agent"]` to `./src/main.ts`.
- `apps/cli/src/main.ts` exists.
- `apps/cli/src/main.ts` imports `dispatchCliCommand` and calls it with `Bun.argv.slice(2)`.
- `apps/cli/src/index.ts` no longer contains an `import.meta.main` executable block.

Existing dispatcher and command tests continue to cover command behavior. After implementation, run the focused test first, then the normal repository gates used for recent CLI changes.

## Rollout

This is a local structural change with no migration. Existing direct development usage of `bun apps/cli/src/index.ts ...` should move to `bun apps/cli/src/main.ts ...`; package bin execution should keep the same `the-agent` behavior after the `package.json` update.

## Out of Scope

- Rewriting the dispatcher.
- Introducing Commander or another CLI framework in this step.
- Renaming commands or changing output text.
- Resolving external live-readiness blockers such as GitHub remotes, provider credentials, and evidence manifests.
