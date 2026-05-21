# CLI App

Short-lived command surface for local runtime operations.

The CLI owns argument parsing, command dispatch, human-readable output, and
smoke-test wrappers. Runtime behavior belongs in packages; this app should stay
thin and route through `src/dispatcher.ts`.

Implemented command groups include:

- `local`, `local run`, `setup live`, `connect`, `proof`, `init`, `run`, `model`, `tools`, `status`, `doctor`, and `doctor --live`
- `connect signup/fill/setup/smoke`
- `proof init`
- `skills list`
- `dream run`
- `identity summary/stage/history`
- `curriculum read/progress/advance`
- `publish list/run/trace`
- `world search/pull/subscribe/subscriptions/transmission-smoke`
- `github smoke/discussion/pull-request/workflow-runs`
- `daemon smoke`

Lower-level/debug command groups remain available when direct scripting is
needed:

- `credentials add/list/smoke`
- `providers configure/list/smoke`
- `connect init` and `live env-init/setup/evidence-init`

Commands are routed through `src/dispatcher.ts` so parser behavior is covered independently from command
implementations. Live provider and GitHub commands require the caller to provide real environment-backed
credentials. `doctor --live` can load a filled readiness handoff file with
the default `~/.vivarium/live/live-readiness.local.env` file and infers a sibling `../the-world` repo
unless `--world-root` is supplied. Failed live-readiness checks return
structured `nextActions`; v1 evidence blockers also include `completionGuide`
so operators can jump directly to the completion-boundary rules before claiming
the roadmap is done.

Use the CLI for local handoff checks such as provider profile smoke tests,
encrypted credential smoke tests, GitHub read/write guards, daemon status, and
world transmission-smoke. `model` summarizes
configured provider profiles without printing secret values and flags expected
live profiles that are still missing. `tools` renders the read-only external
tool and safety policy dashboard. `local` is the shortest local-first
entrypoint: it creates the named `local-agent`, runs quick setup, stages the
private readiness file for later, and prints `local run` as the offline
simple-agent command. `setup` remains available for
custom setup flows. `connect` is the
operator-friendly live setup entrypoint: `setup live` starts the guided wizard
with default private directories under `~/.vivarium`; `onboard live` remains an
alias, and `connect init` remains available as the lower-level setup-file creation command for custom paths.
`connect signup` shows account and
key links without raw env-key wiring, `connect` reports names/world,
GitHub/public release, provider, internal credential, and evidence readiness
without printing raw env-key wiring, `connect fill` updates names/world,
GitHub/public release, provider, internal credential, and evidence values by
friendly setup labels without printing secret values, `connect setup --confirm-write`
materializes the local provider profile file and encrypted internal API
credential store from the default readiness file without printing secret values,
`connect smoke` runs the provider and internal credential
smokes through that same filled setup file, `proof init` creates or repairs the
evidence manifest skeleton from the setup file, and `proof` reviews
the v1 evidence checklist without raw manifest section keys.
When the evidence manifest path is filled, the same confirmed setup creates the
evidence manifest skeleton if it does not already exist. Without
`--confirm-write`, the same setup handoff reports the
target paths, provider profile names, and credential name without writing files.
The lower-level `live evidence-init --path <file>`
remains available for advanced manual repair outside the connect/proof setup path. Reusable logic should move into
`packages/*` before it grows command-specific state.
