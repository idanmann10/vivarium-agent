# the-agent

Local-first agent runtime from `goal.md`.

This workspace contains the core types and math, state repositories, provider adapters, tool dispatch,
runtime primitives, CLI, daemon, and world read/write helpers. Local deterministic flows are implemented
and tested. Live provider calls, GitHub write paths, and canonical-world contribution loops require real
credentials and remotes.

## Commands

- `bun run lint`
- `bun run typecheck`
- `bun run test`
- `bun run build`
- `bun apps/cli/src/index.ts init --domain coding --world-root ../the-world --state-path .vivarium/state.db`
- `bun apps/cli/src/index.ts doctor --live --env-file live-readiness.local.env --agent-root . --world-root ../the-world`
- `bun apps/cli/src/index.ts daemon smoke --status-url http://127.0.0.1:8787/status`

Copy `docs/live-readiness.env.example` to `live-readiness.local.env` before filling live provider,
GitHub, world subscription, and internal API values. Filled env files are ignored by git.

## Influences

- Superpowers: process-oriented skills and implementation discipline.
- GStack: role/command-shaped agent tooling and review surfaces.
