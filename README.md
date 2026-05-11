# Vivarium Agent

local-first agent runtime with memory, Dream consolidation, world retrieval, a CLI, and a daemon.

Vivarium Agent is the per-user runtime for the Vivarium system. It runs goals through typed primitives,
records episodes in local state, retrieves skills and traces from subscribed worlds, consolidates experience
through Dream, and exposes local operations through CLI, daemon, and MCP-style surfaces.

## Production Status

The local runtime, CLI, daemon, world read paths, Dream candidate generation, safety checks, and documentation
gates are implemented and tested. The full `goal.md` v1 cultural-transmission proof is intentionally gated by
`doctor --live`; it still requires real provider keys, an internal API credential, other-agent evidence,
canonical-world publication evidence, and a two-week follow-up measurement.

Open-source production readiness means this repository has public setup, contribution, security, release, and
verification paths. It does not mean the live v1 evidence loop is complete.

## Quick Start

```bash
bun install
bun run lint
bun run knip
bun run typecheck
bun run test
bun run build
```

Initialize a local coding agent against a sibling world checkout:

```bash
bun apps/cli/src/main.ts init --domain coding --world-root ../the-world --state-path .vivarium/state.db
```

Run the live-readiness doctor:

```bash
cp docs/live-readiness.env.example live-readiness.local.env
chmod 600 live-readiness.local.env
bun apps/cli/src/main.ts doctor --live --env-file live-readiness.local.env
```

Filled `live-readiness.local.env` files are ignored by git. Do not commit API keys, credential values,
provider secrets, or evidence files that contain private paths or private customer data.

## Repository Layout

- `apps/cli` - command surface for init, run, providers, credentials, world operations, publishing, and `doctor --live`.
- `apps/daemon` - local runtime host with status, run, Dream, HTTP transport, scheduler, and MCP manifest.
- `packages/core` - pure types, kernel, math, decision thresholds, and Claude Managed Agents compatibility types.
- `packages/state` - in-memory and SQLite repositories, migrations, memory systems, confidence buckets, and semantic facts.
- `packages/runtime` - Plan, Predict, Execute, Monitor, Recover, Validate, Reflect, Dream, attention, and orchestration.
- `packages/tools` - self-tools, external adapters, credentials, anonymization, and safety pipeline.
- `packages/providers` - Anthropic, OpenAI, OpenAI-compatible, local provider profiles, and routing.
- `packages/world` - world retrieval, subscriptions, proposals, visibility routing, and GitHub clients.
- `packages/eval` - deterministic compounding eval helpers.

## Verification

Use the narrowest command for scoped work, then run the full local gate before merging:

```bash
bun run lint
bun run knip
bun run typecheck
bun run test
bun run build
bun run format:check
```

Use `doctor --live` for production evidence. A green local test suite is not a substitute for live provider,
credential, GitHub, other-agent, or two-week improvement evidence.

## Project Policies

- Security reporting and secret-handling rules: [SECURITY.md](SECURITY.md)
- Contributor expectations: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- Contribution workflow: [CONTRIBUTING.md](CONTRIBUTING.md)
- Release checklist: [RELEASING.md](RELEASING.md)
- License: [MIT](LICENSE)
- Documentation index: [docs/README.md](docs/README.md)

## Influences

- Superpowers: process-oriented skills and implementation discipline.
- GStack: role/command-shaped agent tooling and review surfaces.
