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
- `the-agent` Anthropic-native external tool routing implemented after computer-use safety, closing the named Phase 1 external toolset gap with injected adapter and credential resolution tests.
- `the-agent` Docker terminal sandbox adapter implemented after Anthropic-native routing, closing the named Phase 1 `terminal (Docker sandbox)` external tool gap without requiring live Docker execution in tests.
- `the-agent` world pull read-path slice implemented after computer-use confirmation safety.
- `the-agent` published-run retrieval slice implemented after gated world proposal PR helper, allowing `RUN.md` artifacts to be searched by domain and retained in attention context.
- `the-agent` Dream state repository slice implemented after world pull read paths.
- `the-agent` compounding benchmark eval slice implemented after Dream state repository execution.
- `the-agent` state memory implementations slice implemented after compounding benchmark eval.
- `the-agent` CLI install-flow shared-state slice implemented after state memory modules.
- `the-agent` local daemon Compose supervision artifacts implemented after CLI install-flow state; Docker Compose 5.1.3 is installed locally, `docker compose config` renders the service, and `docker compose up -d --build` starts a healthy daemon container.
- `the-agent` Drizzle schema artifact slice implemented after credential kind coverage; `better-sqlite3` package installation is present, Bun runtime execution remains unsupported, and Node-side migration execution is verified by `bun run verify:sqlite-stack`.
- `the-agent` live verification blocker evidence recorded in `9876160`.
- `the-agent` CLI live-readiness doctor implemented after blocker evidence capture, exposing remote/env/GitHub auth/Docker Compose preflight checks through `doctor --live`.
- `the-agent` live-readiness guide added after `doctor --live`, documenting the exact remotes, provider env, GitHub auth, Compose, and cross-install verification steps still required.
- `the-agent` provider smoke CLI implemented after the live-readiness guide, giving live verification a concrete `providers smoke` command for OpenAI, Anthropic, and OpenAI-compatible adapters.
- `the-agent` provider-backed `run` CLI implemented after the episode shape manifest, letting real goal runs select OpenAI, Anthropic, or OpenAI-compatible providers by env-backed configuration.
- `the-agent` credential smoke CLI implemented after provider-backed runs, proving encrypted internal API credentials can be injected through the HTTP dispatcher without returning the secret.
- `the-agent` GitHub smoke CLI implemented after provider smoke, giving live verification a read-only `github smoke` command for repository access, Discussions availability, and token permission metadata.
- `the-agent` daemon smoke CLI implemented after GitHub smoke, giving Compose verification a concrete `daemon smoke` command for the daemon `/status` endpoint.
- `the-agent` guarded GitHub Discussion CLI implemented after daemon smoke, giving Phase 0 RFC verification a concrete `github discussion --confirm-write` path while refusing unconfirmed writes.
- `the-agent` guarded GitHub pull-request CLI implemented after Discussion creation, giving contribution-loop verification a concrete `github pull-request --confirm-write` path while refusing unconfirmed writes.
- `the-agent` GitHub workflow-runs CLI implemented after guarded PR creation, giving live workflow/trust-gate verification a concrete read-only `github workflow-runs` path.
- `the-agent` world transmission-smoke CLI implemented after workflow-runs checks, giving cross-install verification a concrete pull-then-search path for a second local install.
- `the-agent` math-gated world proposal PR helper implemented after transmission-smoke, wiring `shouldPushToWorld` evidence to `GitHubWorldClient.createPullRequest` with tests for pass/fail gates.
- `the-agent` CLI multi-world search implemented after Compose verification, exposing repeated `--world-root` / `--world-label` subscriptions for canonical + private-fork retrieval.
- `the-agent` saved world subscription registry implemented after credential smoke, exposing `world subscribe`, `world subscriptions`, and `world search --subscriptions-path` for reusable canonical + private-fork retrieval.
- `the-agent` saved provider profile registry implemented after saved world subscriptions, exposing `providers configure`, `providers list`, `providers smoke --profile`, and `run --provider-profile` for reusable Anthropic/OpenRouter/private-compatible configuration.
- `the-agent` run-level world subscription retrieval implemented after saved provider profiles, letting `run --world-subscriptions-path` load planning context from canonical + private fork registries.
- `the-agent` visibility-aware proposal target selection implemented after run-level subscriptions, routing internal/private skill proposals to auto-push private worlds and public proposals to canonical/non-auto-push worlds.
- `the-agent` proposed anti-pattern retrieval and Node-side `better-sqlite3` migration verifier implemented after the gated proposal PR helper.
- `the-agent` local end-to-end demo recorder implemented after the SQLite stack verifier; `docs/demos/local-e2e.cast` records init, run, second-install world transmission-smoke, and SQLite stack verification as an asciinema v2 cast.
- `the-agent` proposed trace proposal/retrieval slice implemented after the local demo recorder, writing annotated trace proposals and retrieving them with frontmatter titles through the local world reader.
- `the-agent` proposed run proposal/retrieval slice implemented after trace proposals, writing redacted run proposals and retrieving them through the local world reader.
- `the-agent` episode shape snapshot manifest added after multi-world CLI search, making every episode kind and field set visible in tests per `goal.md` §18.2.
- `the-world` Phase 0 committed at `81b28a2`.
- `the-world` Phase 3 maintenance scripts committed at `866c121`.
- `the-world` trust-gates slice committed at `719f0a1`.
- `the-world` independent validator fingerprint slice implemented after trust gates.
- `the-world` concrete maintenance workflow slice committed at `9ecdff0`.
- `the-world` coding starter-pack depth slice implemented after concrete maintenance workflows.
- Superpowers and GStack URLs are recorded in Phase 0 plan and seed skill lineage.

## Fresh Verification Evidence

`the-agent`:

- `bun run lint`: scanned 187 TypeScript files.
- `bun run typecheck`: TypeScript passed.
- `bun run test`: 164 tests passed, 0 failed.
- `bun run build`: 9 entrypoints present.
- `bun run verify:sqlite-stack`: Node and `better-sqlite3` ran migrations `0001_initial` through `0004_tool_usage`, created all runtime storage tables, and inserted/read `skill-smoke`.
- `bun run record:local-e2e-demo`: generated `docs/demos/local-e2e.cast`.

`the-world`:

- `bun run lint`: world validator reports 40 skills, 6 anti-patterns, 7 traces, 6 runs, 3 curricula, 3 rubrics, 3 exemplars, 1 contributor.
- `bun run typecheck`: TypeScript passed.
- `bun run test`: 10 tests passed, 0 failed.
- `bun run build`: 8 required files present.

Live/external checks:

- `git -C the-agent remote -v` and `git -C the-world remote -v`: no remotes configured.
- `env | sort | rg '^(ANTHROPIC|OPENAI|OPENROUTER|GITHUB|GH_|VIVARIUM|THE_AGENT|INTERNAL|OAI|MODEL)'`: only `GH_PAGER=cat` is present; no provider or GitHub token env vars are configured.
- `gh auth status`: configured GitHub accounts report invalid tokens.
- `docker --version`: Docker 29.4.1 is installed.
- `docker compose version`: Docker Compose 5.1.3 is installed through Homebrew's Docker CLI plugin path.
- `docker-compose version`: Docker Compose 5.1.3 standalone command is installed.
- `docker compose config`: renders the local `vivarium-daemon` service with its healthcheck, read-only world mount, port mapping, and restart policy.
- `docker compose up -d --build`: builds the daemon image after the Dockerfile installs native build prerequisites for `better-sqlite3`, starts the container, and `docker compose ps` reports it healthy.
- `bun apps/cli/src/index.ts daemon smoke --status-url http://127.0.0.1:8787/status`: returns `ok: true` with `daemonStatus: "running"` when run outside the sandbox; `curl http://127.0.0.1:8787/status` returns the same status JSON inside the sandbox.
- `bun apps/cli/src/index.ts doctor --live --agent-root /Users/idanmann/Vivarium/the-agent --world-root /Users/idanmann/Vivarium/the-world`: returns `ok: false` with `agent.remote:missing`, `world.remote:missing`, `provider.env:missing`, `github.env:missing`, `github.auth:invalid`, `docker:installed`, and `docker.compose:installed`.
- `docs/guides/live-readiness.md`: records the handoff path for clearing current external blockers and re-running v1 live verification.
- `bun apps/cli/src/index.ts providers smoke --kind openai --api-key-env VIVARIUM_MISSING_PROVIDER_KEY --model gpt-test`: returns a missing-env result without attempting a provider call.
- `bun apps/cli/src/index.ts github smoke --owner owner --repo world --token-env VIVARIUM_MISSING_GITHUB_TOKEN`: returns a missing-env result without attempting a GitHub API call.
- `bun apps/cli/src/index.ts daemon smoke --status-url http://127.0.0.1:9/status`: returns `ok: false` because no daemon is listening at the test endpoint.
- `bun apps/cli/src/index.ts daemon smoke --status-url http://127.0.0.1:8787/status`: returns `ok: true` against the Compose daemon when run outside the sandbox.
- `bun apps/cli/src/index.ts github discussion ...` without `--confirm-write`: returns a refusal before reading credentials or attempting a GitHub API call.
- `bun apps/cli/src/index.ts github pull-request ...` without `--confirm-write`: returns a refusal before reading credentials or attempting a GitHub API call.
- `bun apps/cli/src/index.ts github workflow-runs --owner owner --repo world --token-env VIVARIUM_MISSING_GITHUB_TOKEN --branch main --limit 2`: returns a missing-env result without attempting a GitHub API call.
- `bun test packages/world/src/pull.test.ts apps/cli/src/commands/world.test.ts apps/cli/src/dispatcher.test.ts`: 20 tests passed, including local second-install world transmission verification and repeated-root CLI search routing.
- `bun test packages/world/src/write.test.ts packages/world/src/github.test.ts tests/e2e-world-integration.test.ts`: 11 tests passed, including trace and run proposal writing, visibility-aware proposal target selection, math-gated proposal PR creation, mocked GitHub writes, and local cultural transmission.
- `bun test packages/world/src/local-reader.test.ts packages/world/src/retrieve.test.ts packages/runtime/src/attention.test.ts`: 8 tests passed, including proposed trace/run retrieval, published-run retrieval across worlds, and attention selection.
- `bun test packages/world/src/write.test.ts packages/world/src/local-reader.test.ts packages/world/src/retrieve.test.ts tests/e2e-world-integration.test.ts`: 15 tests passed, including visibility-aware proposal target selection and proposed trace/run artifact writing and retrieval across the local reader/search path.
- `bun test packages/tools/src/external/index.test.ts packages/tools/src/dispatcher.test.ts packages/tools/src/safety/pipeline.test.ts`: 21 tests passed, including Anthropic-native external adapter routing, credential injection, and Docker terminal sandbox command construction.

## Prompt-To-Artifact Checklist

| Requirement | Evidence | Status |
| --- | --- | --- |
| Read and run `goal.md` | Phase 0 through Phase 3 local slices implemented with specs, plans, tests, and commits | Partially complete |
| Save roadmap somewhere durable | `/Users/idanmann/.codex/memories/vivarium-goal.md` | Complete |
| Keep recoverable checkpoints | Git commits in both local repos plus memory copies of specs/plans | Complete |
| Use Superpowers | Superpowers skills used during execution; URL cited in plan and seed lineage | Complete |
| Use GStack | URL cited in plan and seed lineage for role/command-shaped review patterns | Complete |
| Phase 0 bootstrap | Two local repos, tooling, core types/math/kernel, world seed content, validators | Complete locally |
| Phase checkpoint demo | `docs/demos/local-e2e.cast` records local init, run, second-install world transmission, and SQLite stack verification | Complete locally |
| Testing guidance | Unit/integration coverage includes core math, IDs, self-tools, e2e run/recover/dream, and an episode shape snapshot manifest for every episode kind and field set | Complete locally |
| Phase 1 agent works alone | Offline deterministic runtime, state, SQLite persistence, Drizzle schema artifacts, state memory modules for working/episodic/semantic/procedural/identity memory, semantic facts storage with deletion, versioned SQL migration runner, local provider, Anthropic/OpenAI/OpenAI-compatible HTTP adapters, env-backed provider selection for CLI runs, encrypted credential store with HTTP smoke path, typed tool dispatcher, web/HTTP/file/terminal Docker sandbox/code/MCP/anthropic-native/computer-use external adapters, SQLite-backed self-tools, HTTP/tool safety with output prompt-injection warnings, per-run and persistent per-day rate limits, credential-argument blocking, computer-use click/type confirmation, run-level harmful refusal and destructive confirmation behavior, automatic anti-pattern loading before execution, world read/search/pull/run retrieval paths, concrete primitive modules, attention-limited world context selection with token-budget accounting, daemon service, HTTP transport lifecycle, daemon-owned Dream scheduler loop, MCP tool manifest, local Compose supervisor artifacts, CLI init/run/credentials/skills/world search/pull/transmission-smoke/status/doctor/providers/github/daemon dispatcher and helpers, shared-state CLI init-to-run flow, live-readiness doctor preflight checks, provider/GitHub/daemon smoke commands, guarded GitHub Discussion and pull-request commands, GitHub workflow-runs check, e2e run/recover | Local slice partially complete |
| Phase 2 Dream | Offline deterministic Dream, promotion/pruning/habits/identity/confidence/anonymizer/eval/e2e, StateRepository-backed Dream execution including SQLite, provider-backed anonymizer fallback, anti-pattern candidate generation, annotated trace candidate extraction, SQLite-backed candidate queue, aggregate compounding benchmark eval, and anonymized publishable run queueing from Reflect | Local slice complete |
| Phase 3 world integration | Local proposal/publish, published-run retrieval, proposed anti-pattern/trace/run retrieval, math-gated proposal PR helper, multi-world retrieval with CLI source labels, GitHub PR/issue/Discussion client with mocked tests, world maintenance scripts, concrete archive/auto-merge workflows, trust gates, independent validator machine-fingerprint counting, held-review listing, cultural transmission e2e | Local slice complete |

## Remaining Blockers For Full Roadmap Completion

- Anthropic/OpenAI/OpenRouter-compatible adapters are implemented and tested with mocked fetch; live calls still require API keys and runtime configuration.
- Versioned SQL migrations are implemented on top of `bun:sqlite`; Drizzle schema artifacts and package dependencies are present; Node-side `better-sqlite3` migration execution is verified, while Bun runtime loading of `better-sqlite3` remains unsupported.
- GitHub PR/issue/Discussion client code, math-gated proposal PR helper, and local trust/held-review gate logic are implemented and tested; live PR creation, auto-merge execution, and remote repository settings require actual GitHub remotes and credentials.
- End-to-end cultural transmission is verified locally, including a second-install pull-then-search smoke path, but not against a canonical GitHub world remote.
- Daemon service, HTTP transport lifecycle, daemon-owned Dream scheduler loop, MCP tool manifest, and local Compose supervisor artifacts are implemented and executed locally with Docker Compose.
- The CLI now exposes live blocker checks through `doctor --live`, but resolving the reported blockers still requires remotes and credentials.

## Next Decision

To finish the production roadmap rather than the local executable slices, provide:

1. Final repo names and GitHub remote targets for agent/world.
2. Whether to use real GitHub API writes in this workspace.
3. Provider credentials/environment names to support live model calls.
4. Whether to keep the current `bun:sqlite` runtime plus Node-verified `better-sqlite3`/Drizzle stack artifacts, or migrate the runtime itself away from Bun's SQLite path.
5. Whether to keep the local Docker Compose supervisor as the v1 deployment supervisor.
