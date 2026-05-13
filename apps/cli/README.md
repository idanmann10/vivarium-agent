# CLI App

Short-lived command surface for local runtime operations.

The CLI owns argument parsing, command dispatch, human-readable output, and
smoke-test wrappers. Runtime behavior belongs in packages; this app should stay
thin and route through `src/dispatcher.ts`.

Implemented command groups include:

- `setup`, `init`, `run`, `model`, `status`, `doctor`, and `doctor --live`
- `credentials add/list/smoke`
- `providers configure/list/smoke`
- `live env-init/setup/evidence-init`
- `skills list`
- `dream run`
- `identity summary/stage/history`
- `curriculum read/progress/advance`
- `publish list/run/trace`
- `world search/pull/subscribe/subscriptions/transmission-smoke`
- `github smoke/discussion/pull-request/workflow-runs`
- `daemon smoke`

Commands are routed through `src/dispatcher.ts` so parser behavior is covered independently from command
implementations. Live provider and GitHub commands require the caller to provide real environment-backed
credentials. `doctor --live` can load a filled readiness handoff file with
`--env-file live-readiness.local.env` and infers a sibling `../the-world` repo
unless `--world-root` is supplied. Failed live-readiness checks return
structured `nextActions`; v1 evidence blockers also include `completionGuide`
so operators can jump directly to the completion-boundary rules before claiming
the roadmap is done.

Use the CLI for local handoff checks such as provider profile smoke tests,
encrypted credential smoke tests, GitHub read/write guards, daemon status, and
world transmission-smoke. `model --env-file live-readiness.local.env` summarizes
configured provider profiles without printing secret values and flags expected
live profiles that are still missing. `setup` is the operator-friendly
entrypoint: it runs local `init`, prints a branded terminal checklist, and can
dry-run or confirm the existing `live setup` path when `--env-file` is provided.
`live setup --env-file <file> --confirm-write` materializes the local provider
profile file and encrypted internal API credential store from a filled readiness
file without printing secret values. Without `--confirm-write`, the same command
reports the target paths, provider profile names, and credential name without writing files.
`live evidence-init --path <file>`
creates an empty v1 evidence manifest shape for later real evidence collection. Reusable logic should move into
`packages/*` before it grows command-specific state.
