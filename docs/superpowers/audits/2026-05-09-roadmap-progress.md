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
- `the-world` Phase 0 committed at `81b28a2`.
- `the-world` Phase 3 maintenance scripts committed at `866c121`.
- `the-world` trust-gates slice committed at `719f0a1`.
- Superpowers and GStack URLs are recorded in Phase 0 plan and seed skill lineage.

## Fresh Verification Evidence

`the-agent`:

- `bun run lint`: scanned 167 TypeScript files.
- `bun run typecheck`: TypeScript passed.
- `bun run test`: 70 tests passed, 0 failed.
- `bun run build`: 9 entrypoints present.

`the-world`:

- `bun run lint`: world validator reports 30 skills, 6 anti-patterns, 6 traces, 6 runs, 3 curricula, 3 rubrics, 3 exemplars, 1 contributor.
- `bun run typecheck`: TypeScript passed.
- `bun run test`: 7 tests passed, 0 failed.
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
| Phase 1 agent works alone | Offline deterministic runtime, state, SQLite persistence, semantic facts storage, versioned SQL migration runner, local provider, Anthropic/OpenAI/OpenAI-compatible HTTP adapters, encrypted credential store, typed tool dispatcher, web/HTTP/file/terminal/code/MCP external adapters, self-tools, HTTP/tool safety, run-level harmful refusal and destructive confirmation behavior, world read, concrete primitive modules, attention-limited world context selection, daemon service, HTTP transport lifecycle, scheduler helper, MCP tool manifest, CLI init/run/credentials/skills/world/status/doctor helpers, e2e run/recover | Local slice partially complete |
| Phase 2 Dream | Offline deterministic Dream, promotion/pruning/habits/identity/confidence/anonymizer/eval/e2e, anti-pattern candidate generation, annotated trace candidate extraction, and SQLite-backed candidate queue | Local slice complete |
| Phase 3 world integration | Local proposal/publish, multi-world retrieval, GitHub PR/issue/Discussion client with mocked tests, world maintenance scripts, trust gates, held-review listing, cultural transmission e2e | Local slice complete |

## Remaining Blockers For Full Roadmap Completion

- Anthropic/OpenAI/OpenRouter-compatible adapters are implemented and tested with mocked fetch; live calls still require API keys and runtime configuration.
- Versioned SQL migrations are implemented on top of `bun:sqlite`; replacing that base with the roadmap's `better-sqlite3`/Drizzle stack remains a production stack decision.
- GitHub PR/issue/Discussion client code and local trust/held-review gate logic are implemented and tested; live PR creation, auto-merge execution, and remote repository settings require actual GitHub remotes and credentials.
- End-to-end cultural transmission is verified locally, not across two distinct real installs pulling from a canonical GitHub world.
- Daemon service, HTTP transport lifecycle, scheduler decision helper, and MCP tool manifest are implemented and tested locally; durable process-manager supervision remains a deployment decision.

## Next Decision

To finish the production roadmap rather than the local executable slices, provide:

1. Final repo names and GitHub remote targets for agent/world.
2. Whether to use real GitHub API writes in this workspace.
3. Provider credentials/environment names to support live model calls.
4. Whether to keep the current `bun:sqlite` plus versioned SQL migration base or migrate the repository to the roadmap's `better-sqlite3`/Drizzle stack.
5. Which deployment supervisor should own the long-running daemon process.
