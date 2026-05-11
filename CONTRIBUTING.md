# Contributing to Vivarium Agent

Vivarium Agent is a local-first runtime, so contribution quality is measured by reproducible local behavior and
honest live-readiness evidence. Keep changes narrow, test them directly, and do not imply `goal.md` v1 is complete
unless `doctor --live` says so.

## Setup

```bash
bun install
bun run typecheck
bun run test
```

Use `docs/live-readiness.env.example` as the template for live checks:

```bash
cp docs/live-readiness.env.example live-readiness.local.env
chmod 600 live-readiness.local.env
bun apps/cli/src/main.ts doctor --live --env-file live-readiness.local.env
```

Do not commit `live-readiness.local.env`, provider keys, credential values, generated local evidence, or encrypted
credential stores.

## Contribution Workflow

- Use Conventional Commits for commit messages.
- Add a changeset for user-visible package behavior, CLI behavior, release behavior, or public docs that affect operators.
- Link phase work to a Discussion, design spec, or plan when it changes architecture, core types, math thresholds, kernel behavior, safety, provider routing, world contracts, or live-readiness semantics.
- Keep package boundaries clear. Apps depend on packages; packages import core types instead of duplicating contracts.
- Update docs and tests together when command behavior, configuration, evidence requirements, or public workflows change.

## Local Gates

Run focused tests while developing. Before opening or updating a PR, run:

```bash
bun run lint
bun run knip
bun run typecheck
bun run test
bun run build
bun run format:check
```

`bun run knip` is part of the production-readiness gate because unresolved or unlisted dependencies create brittle
operator installs.

## Security

Read `SECURITY.md` before touching credentials, provider calls, tool dispatch, anonymization, GitHub publishing,
or live-readiness files. Never paste real tokens into tests, docs, issue bodies, PR descriptions, or generated
world artifacts.

## Live Boundary

Local green checks prove local implementation health. Full v1 completion requires `doctor --live` with a filled
`live-readiness.local.env` and inspectable evidence for provider smokes, internal credential smoke, public
contribution, published artifacts, curation stats, and the two-week improvement measurement.
