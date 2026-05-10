# Roadmap Progress Audit

## Objective

Run `goal.md`, save it durably, and use `https://github.com/obra/superpowers` plus `https://github.com/garrytan/gstack` as references.

## Completed Evidence

- Roadmap saved as `/Users/idanmann/.codex/memories/vivarium-goal.md` and verified byte-for-byte against `/Users/idanmann/Vivarium/goal.md`.
- Phase 0 plan saved in `docs/superpowers/plans/2026-05-09-phase-0-bootstrap.md` and `/Users/idanmann/.codex/memories/vivarium-phase-0-bootstrap-plan.md`.
- Phase 1, Phase 2, and Phase 3 specs/plans saved in this repo and mirrored into `/Users/idanmann/.codex/memories/`.
- `the-agent` Phase 0 committed at `8052c88`.
- `the-agent` local Phase 1 runtime slice committed at `81ba469`.
- `the-agent` local Phase 2 Dream slice committed at `e3f4d5e`.
- `the-agent` local Phase 3 world-integration slice committed at `6733564`.
- `the-agent` SQLite persistence slice committed after Phase 3.
- `the-agent` provider adapter slice committed after SQLite persistence.
- `the-agent` daemon service slice committed after provider adapters.
- `the-agent` GitHub world client slice committed after daemon service.
- `the-agent` SQLite migration runner slice implemented after GitHub world client.
- `the-agent` daemon HTTP transport slice implemented after SQLite migrations.
- `the-agent` tools/credentials dispatch slice implemented after daemon HTTP transport.
- `the-agent` runtime primitive modules and attention selection slice implemented after tools/credentials dispatch.
- `the-agent` semantic facts storage slice implemented after runtime primitive modules.
- `the-agent` CLI init starter-pack slice implemented after semantic facts storage.
- `the-agent` CLI credentials/skills/world helper slice implemented after CLI init.
- `the-agent` web external tools slice implemented after CLI command helpers.
- `the-agent` run-level safety behavior slice implemented after web external tools.
- `the-agent` Dream candidate-generation slice implemented after run-level safety behavior.
- `the-agent` attention token-budget slice implemented after Dream candidate generation.
- `the-agent` provider-backed anonymizer fallback slice implemented after attention token-budget accounting.
- `the-agent` daemon Dream scheduler loop slice implemented after provider anonymizer fallback.
- `the-agent` CLI dispatcher slice implemented after daemon Dream scheduler.
- `the-agent` SQLite-backed self-tools slice implemented after CLI dispatcher.
- `the-agent` publishable run queue slice implemented after SQLite-backed self-tools.
- `the-agent` tool-output prompt-injection warning slice implemented after publishable run queueing.
- `the-agent` tool rate-limit and credential-argument safety slice implemented after tool-output prompt-injection warnings.
- `the-agent` persistent daily tool rate-limit slice implemented after credential-argument safety.
- `the-agent` computer-use routing and confirmation safety slice implemented after persistent daily tool rate limits.
- `the-agent` world pull read-path slice implemented after computer-use confirmation safety.
- `the-agent` Dream state repository slice implemented after world pull read paths.
- `the-agent` compounding benchmark eval slice implemented after Dream state repository execution.
- `the-agent` state memory implementations slice implemented after compounding benchmark eval.
- `the-agent` CLI install-flow shared-state slice implemented after state memory modules.
- `the-agent` local daemon Compose supervision artifacts implemented after CLI install-flow state; Compose CLI execution remains unverified because this workspace lacks `docker compose` and `docker-compose`.
- `the-world` Phase 0 committed at `81b28a2`.
- `the-world` Phase 3 maintenance scripts committed at `866c121`.
- `the-world` trust-gates slice committed at `719f0a1`.
- `the-world` independent validator fingerprint slice implemented after trust gates.
- `the-world` concrete maintenance workflow slice committed at `9ecdff0`.
- `the-world` coding starter-pack depth slice implemented after concrete maintenance workflows.
- Superpowers and GStack URLs are recorded in Phase 0 plan and seed skill lineage.

## Fresh Verification Evidence

`the-agent`:

- `bun run lint`: scanned 173 TypeScript files.
- `bun run typecheck`: TypeScript passed.
- `bun run test`: 106 tests passed, 0 failed.
- `bun run build`: 9 entrypoints present.

`the-world`:

- `bun run lint`: world validator reports 40 skills, 6 anti-patterns, 7 traces, 6 runs, 3 curricula, 3 rubrics, 3 exemplars, 1 contributor.
- `bun run typecheck`: TypeScript passed.
- `bun run test`: 10 tests passed, 0 failed.
- `bun run build`: 8 required files present.

## Prompt-To-Artifact Checklist

| Requirement | Evidence | Status |
| --- | --- | --- |
| Read and run `goal.md` | Phase 0 through Phase 3 local slices implemented with specs, plans, tests, and commits | Partially complete |
| Save roadmap somewhere durable | `/Users/idanmann/.codex/memories/vivarium-goal.md` | Complete |
| Keep recoverable checkpoints | Git commits in both local repos plus memory copies of specs/plans | Complete |
| Use Superpowers | Superpowers skills used during execution; URL cited in plan and seed lineage | Complete |
| Use GStack | URL cited in plan and seed lineage for role/command-shaped review patterns | Complete |
| Phase 0 bootstrap | Two local repos, tooling, core types/math/kernel, world seed content, validators | Complete locally |
| Phase 1 agent works alone | Offline deterministic runtime, state, SQLite persistence, state memory modules for working/episodic/semantic/procedural/identity memory, semantic facts storage with deletion, versioned SQL migration runner, local provider, Anthropic/OpenAI/OpenAI-compatible HTTP adapters, encrypted credential store, typed tool dispatcher, web/HTTP/file/terminal/code/MCP/computer-use external adapters, SQLite-backed self-tools, HTTP/tool safety with output prompt-injection warnings, per-run and persistent per-day rate limits, credential-argument blocking, computer-use click/type confirmation, run-level harmful refusal and destructive confirmation behavior, automatic anti-pattern loading before execution, world read/search/pull paths, concrete primitive modules, attention-limited world context selection with token-budget accounting, daemon service, HTTP transport lifecycle, daemon-owned Dream scheduler loop, MCP tool manifest, local Compose supervisor artifacts, CLI init/run/credentials/skills/world search/pull/status/doctor dispatcher and helpers, shared-state CLI init-to-run flow, e2e run/recover | Local slice partially complete |
| Phase 2 Dream | Offline deterministic Dream, promotion/pruning/habits/identity/confidence/anonymizer/eval/e2e, StateRepository-backed Dream execution including SQLite, provider-backed anonymizer fallback, anti-pattern candidate generation, annotated trace candidate extraction, SQLite-backed candidate queue, aggregate compounding benchmark eval, and anonymized publishable run queueing from Reflect | Local slice complete |
| Phase 3 world integration | Local proposal/publish, multi-world retrieval, GitHub PR/issue/Discussion client with mocked tests, world maintenance scripts, concrete archive/auto-merge workflows, trust gates, independent validator machine-fingerprint counting, held-review listing, cultural transmission e2e | Local slice complete |

## Remaining Blockers For Full Roadmap Completion

- Anthropic/OpenAI/OpenRouter-compatible adapters are implemented and tested with mocked fetch; live calls still require API keys and runtime configuration.
- Versioned SQL migrations are implemented on top of `bun:sqlite`; replacing that base with the roadmap's `better-sqlite3`/Drizzle stack remains a production stack decision.
- GitHub PR/issue/Discussion client code and local trust/held-review gate logic are implemented and tested; live PR creation, auto-merge execution, and remote repository settings require actual GitHub remotes and credentials.
- End-to-end cultural transmission is verified locally, not across two distinct real installs pulling from a canonical GitHub world.
- Daemon service, HTTP transport lifecycle, daemon-owned Dream scheduler loop, MCP tool manifest, and local Compose supervisor artifacts are implemented and tested locally where possible; Compose CLI execution remains blocked by missing local Docker Compose tooling.

## Next Decision

To finish the production roadmap rather than the local executable slices, provide:

1. Final repo names and GitHub remote targets for agent/world.
2. Whether to use real GitHub API writes in this workspace.
3. Provider credentials/environment names to support live model calls.
4. Whether to keep the current `bun:sqlite` plus versioned SQL migration base or migrate the repository to the roadmap's `better-sqlite3`/Drizzle stack.
5. Which deployment supervisor should own the long-running daemon process.
