# V1 Completion Audit Refresh

## Objective Restated

Continue following `/Users/idanmann/Vivarium/goal.md` until the project is genuinely done:

- Build `the-agent`: local-first runtime, memory, providers, tools, primitives, daemon, CLI, tests, and docs.
- Build `the-world`: GitHub-hosted culture repo with seed content, validation, stats, trust gates, and maintenance workflows.
- Prove the v1 loop from `goal.md`: install/init with starter pack, live providers and credentials, canonical plus private worlds, real goals, Dream outputs, public/private contributions, canonical-world PR/auto-merge, cross-install pull/use, featured picks, stats, and contributor profile evidence.
- Preserve recovery artifacts: specs, plans, audits, command evidence, and commits.

## Current Status

Not complete. Local implementation, GitHub setup, and CI gates are strong, including agent dependency gates, world CI/revalidation build coverage, anti-pattern validation coverage, domain learning artifact validation coverage, contribution proposal validation coverage, auto-merge checkpoint coverage, generated-maintenance-PR checkpoint coverage, full-gate PR template guidance, the dedicated CLI `main.ts` entrypoint, and live v1 evidence-manifest gating with inspectable URL-or-local-path evidence reference checks. The v1 loop still lacks live external provider/internal proof and real multi-agent evidence. The current blockers are not proxy signals; they are direct failures from `doctor --live`.

## Prompt-To-Artifact Checklist

| Requirement from `goal.md` | Current evidence | Status |
| --- | --- | --- |
| Resumed objective: check current Claude Managed Agents and Claude Code agent docs before future agent-building work | `docs/reference/claude-agent-formats.md` records current Claude Managed Agents concepts, API beta/toolset details, agent fields including `multiagent`, `description`, and `metadata`, skill source shapes, MCP secret split, Claude Code subagent YAML/frontmatter fields including `maxTurns`, `memory`, `effort`, `background`, `color`, and `initialPrompt`, scope priority, worktree isolation, and agent-team reuse of subagent definitions. `packages/core/src/types/claude-agent-format.ts` exports the local compatibility constants and request/frontmatter types for future code. `scripts/reference-docs.test.ts` guards the reference, and the 2026-05-11 resume section below lists the official docs checked | Complete locally |
| Phase 0: both repos compile/lint/test/build | Fresh local gates: `the-agent` `bun run typecheck`, `bun run test`, `bun run lint`, `bun run format:check`, `bun run build`, and `bun run knip` exit 0; `the-world` `bun run lint`, `bun run typecheck`, `bun run test`, and `bun run build` exit 0. Agent CI/release include `bun run knip`; world CI/manual revalidation, anti-pattern validation, domain learning artifact validation, proposal validation, auto-merge, generated maintenance PRs, and PR templates include the current local checkpoints | Complete locally |
| Phase 0: world has seed content of every primitive | Fresh `the-world bun run lint` reports 3 domains, 40 skills, 6 anti-patterns, 7 traces, 6 runs, 3 curricula, 3 rubrics, 3 exemplars, 1 contributor; domain learning artifact validator covers curricula, rubrics, and exemplars | Complete locally |
| Phase 0: one Discussion open demonstrating RFC format | Phase 0 RFC Discussion exists at `https://github.com/idanmann10/vivarium-world/discussions/1`, and `doctor --live` reports `github.discussion:configured` with the filled local env file | Complete externally |
| Phase 1: installed agent can run a real goal with providers and credential | CLI/provider/credential paths are implemented and tested with local/mocked adapters; no Anthropic/OpenRouter/private OAI-compatible credentials or internal API target are configured | Incomplete externally |
| Phase 1: coding starter pack install and first runs | Durable local evidence exists at `/Users/idanmann/.codex/memories/vivarium-v1-starter-pack-2026-05-11.db`, `/Users/idanmann/.codex/memories/vivarium-v1-starter-run-1.md`, and `/Users/idanmann/.codex/memories/vivarium-v1-starter-run-2.md`; fresh `doctor --live` reports `v1.starterPack:configured` | Complete locally |
| Phase 1: anti-pattern lookup, curriculum advance, confidence buckets | Covered by local runtime, init, self-tool, CLI command, and Dream/state tests in existing audit evidence | Complete locally |
| Phase 1: roadmap CLI file-tree command groups | `cliCommands` advertised `dream`, `identity`, `curriculum`, and `publish`; dispatcher now routes `dream run`, `identity summary/stage/history`, `curriculum read/progress/advance`, and `publish list/run/trace` through real SQLite/runtime/world helpers. `apps/cli/src/dispatcher.test.ts` covers the previously advertised-but-unrouted command groups | Complete locally |
| Agent repo file tree: CLI entrypoint | `apps/cli/src/main.ts` now exists as the executable process wrapper, `apps/cli/package.json` maps `bin.the-agent` to `./src/main.ts`, and `apps/cli/src/index.ts` is the public export surface without an `import.meta.main` executable block. `apps/cli/src/index.test.ts` guards the boundary | Complete locally |
| Phase 1: CLI app public API exports | `apps/cli/src/index.ts` now exports the implemented world pull and transmission-smoke command helpers as well as subscription/search helpers; `apps/cli/src/index.test.ts` guards the public API surface | Complete locally |
| Phase 2: Dream produces anti-pattern, trace, publishable run, compounding eval | Covered by local Dream/eval tests in existing audit evidence | Complete locally |
| Phase 3: public/private world subscriptions and cross-install cultural transmission | Canonical and private world refs are configured in the live subscription registry; local transmission smoke and subscription registry paths exist. No live other-agent pull/use evidence exists yet | Partially complete; live cultural transmission incomplete |
| Phase 3: public skill PR, validator signals, auto-merge, other agents pull/use it | GitHub client, PR helper, signal, trust, proposal validation, full-checkpoint auto-merge workflow logic, and full-gate contribution templates are locally tested; no live GitHub PR/workflow/auto-merge run exists | Incomplete externally |
| Phase 3: anti-pattern, trace, and run published and read by another agent | Local publish/read paths exist; world run, trace, and anti-pattern validators are locally tested; no live canonical-world publish/read loop exists | Incomplete externally |
| Phase 3: featured pick and STATS concentration | World scripts, checked-in stats, CI build gate, manual revalidation build gate, and generated maintenance PR post-mutation gates are locally verified; live maintainer workflow execution and live telemetry are unverified | Complete locally, incomplete live |
| V1 done: five real goals over a week and two-week measurable improvement | Starter-pack and world-subscription evidence is configured; five distinct real coding goals now have inspectable local evidence under `/Users/idanmann/.codex/memories/`, dated 2026-05-09 through 2026-05-11; local behavior-loop evidence is configured. Provider smokes, internal credential smoke, the required seven-day real-goal span, Dream artifacts, public contribution/auto-merge/other-agent pull-use evidence, published artifact reads, curation stats, and the fourteen-day-or-later follow-up remain missing in fresh `doctor --live` output | Incomplete externally |
| Naming decision | Final GitHub repo names are `vivarium-agent`, `vivarium-world`, and `vivarium-world-private`; `doctor --live` reports `agent.name:configured` and `world.name:configured` with the filled local env file | Complete |
| Live readiness handoff | `docs/live-readiness.env.example`, `docs/guides/live-readiness.md`, `doctor --live --env-file`, structured `nextActions`, and v1 evidence manifest checks exist; permissive filled env-file permissions, copied `<...>` values, missing credential store master key and internal API credential value, missing live-loop evidence, missing starter-pack first-run references, missing starter-pack installed skill/trace references, missing named real coding goals, future-dated real goals or two-week follow-up evidence, missing unfamiliar-territory anti-pattern lookup or similar-workflow trace evidence, missing Monitor tool-failure evidence before Recover, missing destructive endpoint escalation/confirmation/continuation evidence, out-of-order destructive endpoint evidence, bare evidence IDs, missing local evidence references, duplicate real-goal IDs or evidence refs, opaque, duplicated, or configured-ref-mismatched world subscription refs, duplicated counted evidence refs, duplicated provider smoke evidence refs, missing or duplicated Dream internal/public skill evidence, missing Dream internal private-fork-only evidence, missing Dream trace source-run or annotation evidence, bare public-contribution signal/pull counts, local public-contribution PR/auto-merge/canonical landing refs, wrong-repo public-contribution or competing-Discussion GitHub URLs, local or wrong-repo two-week competing skill references, two-week competing references missing the landed public skill, local or wrong-repo published anti-pattern/trace/run refs, missing public-contribution contributor identity, missing public-skill math-gate evidence or neutral trust, duplicate positive-signal or external pull/use agent identities, contributor self-signals counted as other-agent evidence, generic or duplicated trace/run Plan-read evidence, missing other-agent trace/run Plan-read identities, missing published-artifact contributor identity, mismatched loop contributor identities across public contribution, published artifacts, curation stats, and two-week follow-up, contributor self-reads counted as trace/run Plan-read evidence, stale or underspecified v1 next-action guidance, sub-30% top-five contributor concentration, generic featured-pick evidence without a different contributor's anti-pattern, missing contributor-profile summary counts/trust, slower two-week follow-up metrics with claimed improvement, missing similar-goal comparison evidence, local or non-Discussion competing variant refs, missing live competing skill variant refs, missing or anonymous two-week other-agent refinement evidence, missing two-week contributor identity, and contributor self-refinement counted as other-agent refinement evidence now report as blockers. The guide's manifest example now uses distinct inspectable local paths or URLs for starter-pack skills/traces, provider smokes, named real coding goals, world subscription refs matching the configured live refs, positive-signal agent/evidence records, other-agent external pull/use, first-run, unfamiliar-territory anti-pattern lookup, similar-workflow trace evidence, ordered destructive endpoint sequence evidence, trace-read and run-read other-agent records, published-artifact contributor identity, canonical-world GitHub blob refs for published anti-pattern/trace/run artifacts, Dream-candidate, distinct Dream internal/public skill artifacts, Dream internal private-fork-only artifacts, Dream trace source-run and annotation artifacts, the same public-contribution contributor identity across published artifacts, curation stats, and two-week follow-up, GitHub PR/action/canonical landing evidence in the configured canonical world repo, featured anti-pattern by another contributor, live canonical-world competing skill URLs including the landed public skill, two-week similar-goal comparison, competing Discussion in the configured canonical world repo, and two-week refinement agent/evidence records excluding the contributor, and `scripts/reference-docs.test.ts` prevents opaque placeholder references from returning | Complete locally |

## Fresh Evidence

- `git remote -v` in `the-agent`: `origin` points to `https://github.com/idanmann10/vivarium-agent.git`.
- `git remote -v` in `the-world`: `origin` points to `https://github.com/idanmann10/vivarium-world.git`; `private` points to `https://github.com/idanmann10/vivarium-world-private.git`.
- `test -f apps/cli/src/main.ts` in `the-agent`: exits 0.
- `ls apps/cli/src` in `the-agent`: includes `main.ts` alongside `commands`, `dispatcher.test.ts`, `dispatcher.ts`, `index.test.ts`, `index.ts`, and `lib`.
- `apps/cli/package.json`: `bin.the-agent` is `./src/main.ts`.
- `apps/cli/src/index.ts`: no `dispatchCliCommand` import and no `import.meta.main` executable block.
- `bun test apps/cli/src/index.test.ts`: 2 tests passed, 0 failed, including the dedicated process-entrypoint regression.
- `bun apps/cli/src/main.ts doctor --live --agent-root /Users/idanmann/Vivarium/the-agent --world-root /Users/idanmann/Vivarium/the-world`: `ok:false`.
- Real-env live blockers: provider keys, Anthropic/OpenRouter/private-compatible model/base/context targets, provider profile file creation, live provider smokes, encrypted credential store creation, credential master key, internal API credential value/health URL, internal credential smoke, and the populated v1 evidence sections.
- Passing live checks: `liveEnvFile.permissions:configured`, `agent.name:configured`, `world.name:configured`, `agent.remote:configured`, `world.remote:configured`, `world.subscriptionsPath:configured`, `world.canonicalRef:configured`, `world.privateForkRef:configured`, `github.env:configured`, `github.owner:configured`, `github.repositoryId:configured`, `github.discussionCategoryId:configured`, `github.auth:ok`, `github.discussion:configured`, `github.agentCi:ok`, `github.worldCi:ok`, `docker:installed`, `docker.compose:installed`, and `v1.evidencePath:configured`.
- `live-readiness.local.env` now exists as an ignored local copy of `docs/live-readiness.env.example` with `0600` permissions, so the setup checkpoint can be resumed without committing secrets.
- `ls -l live-readiness.local.env`: `-rw-------`.
- `git status --short --ignored live-readiness.local.env`: `!! live-readiness.local.env`.
- `bun apps/cli/src/main.ts doctor --live --env-file live-readiness.local.env --agent-root /Users/idanmann/Vivarium/the-agent --world-root /Users/idanmann/Vivarium/the-world`: `ok:false` with GitHub, Docker, world subscription, and v1 evidence-path setup checks passing; provider, credential smoke, and real v1 evidence sections remain blocked.
- `docs/live-readiness.env.example` and `docs/guides/live-readiness.md` now instruct operators to copy the local env file and run `chmod 600 live-readiness.local.env` before filling live secrets; `doctor --live --env-file` reports `liveEnvFile.permissions:insecure` for permissive filled local env files until group/world permissions are removed; `scripts/reference-docs.test.ts` guards both docs.
- `bun test apps/cli/src/commands/doctor.test.ts -t "reports missing internal API credential metadata as live readiness blockers"` first failed because `doctor --live` did not report `credentials.masterKey:missing`, then passed after adding `VIVARIUM_CREDENTIALS_MASTER_KEY` to the live-readiness checks and next actions.
- `scripts/reference-docs.test.ts` first failed after adding `VIVARIUM_CREDENTIALS_MASTER_KEY` to the live-readiness env-var contract, then passed after documenting the env var in `docs/live-readiness.env.example` and `docs/guides/live-readiness.md`.
- `bun test scripts/reference-docs.test.ts -t "documents live credential commands with exported environment variables"` first failed because the internal credential add/smoke examples still hardcoded the credential path, credential name, and health URL, then passed after those examples switched to the exported live-readiness variables.
- `bun test apps/cli/src/commands/doctor.test.ts -t "reports missing internal API credential metadata as live readiness blockers"` later failed because `doctor --live` did not report `internalApi.credentialValue:missing`, then passed after adding `VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE` to the live-readiness checks and next actions.
- `bun test scripts/reference-docs.test.ts -t "documents live credential commands with exported environment variables"` later failed because the credential add example still used `<redacted>` for the credential value, then passed after the command switched to `$VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE`.
- `bun test apps/cli/src/dispatcher.test.ts -t "reports permissive live env file permissions as a readiness blocker"` first failed because `doctor --live --env-file` consumed group/world-readable env files without reporting `liveEnvFile.permissions:insecure`, then passed after the dispatcher passed the env-file path into the live doctor permission check.
- `bun test apps/cli/src/dispatcher.test.ts -t "does not require restrictive permissions for env example templates"` first failed because a permissive `live-readiness.env.example` template reported `liveEnvFile.permissions:insecure`, then passed after `doctor --live --env-file` exempted `.env.example` templates from secret-file permission checks.
- `bun test scripts/reference-docs.test.ts -t "documents guide workflows"` first failed because `docs/guides/live-readiness.md` did not name `liveEnvFile.permissions:insecure`, then passed after documenting the exact blocker.
- `bun test apps/cli/src/commands/doctor.test.ts -t "counts private OAI-compatible credentials as configured provider environment"` first failed because `provider.privateOaiCompat:configured` still left `provider.env:missing`, then passed after the generic provider environment check counted `VIVARIUM_OAI_COMPAT_API_KEY`.
- `bun apps/cli/src/main.ts doctor --live --env-file docs/live-readiness.env.example --agent-root /Users/idanmann/Vivarium/the-agent --world-root /Users/idanmann/Vivarium/the-world`: `ok:false` with copied template values classified as `:placeholder` or unavailable, not live-ready, and without any `liveEnvFile.permissions:*` template blocker.
- `bun apps/cli/src/main.ts doctor --live --agent-root /Users/idanmann/Vivarium/the-agent --world-root /Users/idanmann/Vivarium/the-world`: `ok:false`, now including `v1.evidencePath:missing` so setup readiness cannot be confused with v1 loop verification.
- Local disk pressure was cleared before continuing live-readiness work: `/` had only 116 MiB available and shell startup emitted `No space left on device`; root-cause inspection found a 15 GiB Codex TUI log and large regenerable cache directories. The deleted log remains held open by the active Codex process until session exit, but after deleting regenerable user caches, `df -h / /System/Volumes/Data` reports 2.7 GiB available and subsequent shell/git/doctor commands no longer emit the rbenv temp-file error.
- `bun run typecheck` in `the-agent`: TypeScript passed.
- `bun run test` in `the-agent`: 278 tests passed, 0 failed, 1426 assertions.
- `bun run lint` in `the-agent`: repo lint scanned 197 TypeScript files, and Oxlint found 0 warnings and 0 errors.
- `bun run format:check` in `the-agent`: all matched package/config/tooling files use the expected Oxfmt format.
- `bun run build` in `the-agent`: 9 entrypoints present.
- `bun run knip` in `the-agent`: exits 0 for dependency, unlisted, and unresolved dependency checks.
- `bun test apps/cli/src/dispatcher.test.ts -t "routes advertised dream, identity, curriculum, and publish commands"` first failed on `Unknown command "identity"` after reproducing `Unknown command "dream"`, then passed after dispatcher routing was added.
- `bun test apps/cli/src/dispatcher.test.ts apps/cli/src/commands/init.test.ts`: 23 tests passed, 0 failed, 57 assertions.
- `bun test apps/cli/src/dispatcher.test.ts`: 24 tests passed, 0 failed, 50 assertions.
- `bun run test` in `the-agent` after the CLI routing fix: 230 tests passed, 0 failed, 1221 assertions.
- `bun test apps/cli/src/index.test.ts` first failed because `pullWorldCommand` was undefined in the CLI public API, then passed after exporting `pullWorldCommand` and `verifyWorldTransmissionCommand`.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 starter pack evidence to show first runs referenced it"` first failed because `v1.starterPack` accepted counts and curriculum evidence without first-run references, then passed after the verifier required at least two inspectable first-run references.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 behavior loop evidence to include monitor tool-failure detection"` first failed because `v1.behaviorLoop` accepted Recover re-plan evidence without Monitor tool-failure detection evidence, then passed after the verifier required both.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 behavior loop evidence for unfamiliar anti-pattern lookup and similar workflow traces"` first failed because generic anti-pattern and trace references configured `v1.behaviorLoop`, then passed after `doctor --live` required unfamiliar-territory anti-pattern lookup evidence and similar-workflow trace evidence.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 destructive endpoint evidence to include escalation confirmation and continuation"` first failed because `v1.behaviorLoop` accepted only destructive-hold evidence for a destructive endpoint run, then passed after the verifier required escalation, user confirmation, and continuation evidence too.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 destructive endpoint evidence to hold escalate confirm and continue in order"` first failed because out-of-order destructive endpoint evidence configured `v1.behaviorLoop`, then passed after `doctor --live` required one ordered destructive-endpoint run sequence: hold, escalation, confirmation, continuation.
- `bun test apps/cli/src/commands/doctor.test.ts -t "rejects public contribution counts without inspectable signal and pull evidence"` first failed because `v1.publicContribution` was configured from bare `positiveSignals`/`externalPulls` counts, then passed after `doctor --live` required five inspectable positive-signal references and three inspectable external pull/use references.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 public contribution PR, auto-merge, and canonical landing to be remote GitHub evidence"` first failed because local PR, auto-merge, and canonical landing files configured `v1.publicContribution`, then passed after `doctor --live` required a GitHub PR URL, a GitHub Actions run URL, and canonical world skill landing evidence.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 GitHub evidence URLs to target the configured canonical world repo"` first failed because wrong-repo GitHub PR, Actions, canonical skill, and competing Discussion URLs configured v1 evidence, then passed after `doctor --live` required those URLs to match the configured canonical world owner/repo.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 two-week competing skill references to target"` first failed because local `domains/.../SKILL.md` paths configured two-week competing variant evidence even with a configured canonical GitHub repo, then passed after `doctor --live` required canonical-world GitHub skill URLs and required the two-week variants to include the landed public skill.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 two-week competing skill references to include"` passed with the landed-public-skill guard in place; after temporarily relaxing that one guard, the same test failed because two unrelated canonical-world skill URLs configured `v1.twoWeekImprovement`, then passed again after restoring the guard.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 contributor identities to stay consistent across the loop"` first failed because different public-contribution, published-artifact, curation, and two-week contributor identities still configured those v1 sections, then passed after `doctor --live` anchored them to the public-contribution contributor.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 public contribution signal and pull/use agents to be other than the contributor"` first failed because the contributor's own agent could configure `v1.publicContribution` as one of the positive-signal and external pull/use agents, then passed after `doctor --live` required a contributor identity and excluded that identity from other-agent evidence.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 world subscriptions to name distinct inspectable refs"` first failed because `v1.worldSubscriptions` accepted `"yes"`/`"yes"`, then passed after the verifier required distinct remote-style canonical and private-fork refs.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 world subscriptions to match configured live refs"` first failed because a manifest could name a different remote-style canonical/private pair than the configured live refs, then passed after `doctor --live` required exact manifest matches for configured `VIVARIUM_CANONICAL_WORLD_REF` and `VIVARIUM_PRIVATE_WORLD_REF`.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 public contribution math gate evidence and neutral trust"` first failed because `v1.publicContribution` was configured without math-gate evidence or contributor trust, then passed after `doctor --live` required an inspectable math-gate reference and contributor trust of at least 0.5.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 published trace and run to be read during another agent plan"` first failed because a generic `secondInstallRead` configured `v1.publishedArtifacts`, then passed after `doctor --live` required separate trace and run Plan-read evidence.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 published trace and run to be read during another agent plan"` later failed because `nextActions` still asked for generic second-install read evidence, then passed after the action text named separate trace and run Plan-read evidence.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 published artifacts to target the configured canonical world repo"` first failed because local published anti-pattern, trace, and run paths configured `v1.publishedArtifacts` even with a configured canonical world repo, then passed after `doctor --live` required canonical-world GitHub blob refs for those published artifacts.
- `bun test apps/cli/src/commands/doctor.test.ts -t "describes detailed v1 evidence requirements in next actions"` later failed because the published-artifacts action did not name canonical-world GitHub blob refs, then passed after the action text did.
- `bun test apps/cli/src/commands/doctor.test.ts -t "published trace and run"` first failed because one reused Plan-read artifact configured both trace and run reads, then passed after `doctor --live` required distinct trace and run Plan-read evidence.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 published trace and run Plan-read evidence to name other agents"` first failed because distinct trace/run Plan-read files without agent identities configured `v1.publishedArtifacts`, then passed after `doctor --live` required other-agent Plan-read agent/evidence records.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 published trace and run Plan-read agents to differ from the contributor"` first failed because the contributor's own agent could configure the published trace/run Plan-read evidence, then passed after `doctor --live` required a published-artifact contributor identity and excluded that identity from trace/run Plan-read records.
- `bun test apps/cli/src/commands/doctor.test.ts -t "describes detailed v1 evidence requirements in next actions"` first failed because v1 next actions omitted details such as internal/public Dream skills, math gate, contributor trust, 30% concentration, fourteen-day follow-up timing, and profile counts, then passed after the action text mirrored those requirements.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 curation stats to show the roadmap top-five contributor concentration"` first failed because `v1.curationStats` was configured with `top5SkillSharePercent: 1`, then passed after `doctor --live` required the roadmap's 30% minimum.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 curation stats to feature a different contributor anti-pattern"` first failed because generic featured-pick and `STATS.md` evidence configured `v1.curationStats`, then passed after `doctor --live` required an inspectable featured anti-pattern and distinct agent/featured contributor identities.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 two-week evidence to include contributor profile counts and trust"` first failed because `v1.twoWeekImprovement` was configured without the v1 contributor-profile facts, then passed after `doctor --live` required summary counts for public skills, anti-patterns, traces, published runs, internal skills, and public trust.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 two-week improvement to cite other-agent refinement evidence"` first failed because `v1.twoWeekImprovement` was configured without evidence that other agents' usage refined the skill, then passed after `doctor --live` required an inspectable refinement evidence reference.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 two-week refinement evidence to name other agents"` first failed because one bare refinement evidence file configured `v1.twoWeekImprovement`, then passed after `doctor --live` required two distinct other-agent refinement agent/evidence records.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 two-week refinement agents to differ from the contributor"` first failed because the contributor's own agent could configure one of the two-week refinement agents, then passed after `doctor --live` required a two-week contributor identity and excluded that identity from refinement evidence.
- `bun test apps/cli/src/commands/doctor.test.ts -t "two-week"` first failed because slower follow-up metrics with a claimed positive improvement configured `v1.twoWeekImprovement`, then passed after `doctor --live` required the follow-up metric to be lower than the baseline metric.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 two-week improvement to compare similar goals"` first failed because faster two-week metrics without evidence that the measured goals were similar configured `v1.twoWeekImprovement`, then passed after `doctor --live` required similar-goal comparison evidence.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 two-week competing variant evidence to be a GitHub Discussion URL"` first failed because a local competing-discussion artifact configured `v1.twoWeekImprovement`, then passed after `doctor --live` required `competingDiscussion` to be a GitHub Discussion URL.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 two-week evidence to cite both live competing skill variants"` first failed because a competing Discussion alone configured `v1.twoWeekImprovement`, then passed after `doctor --live` required two distinct inspectable skill references for the original public skill and competing variant.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires counted v1 evidence arrays to reference distinct artifacts"` first failed because duplicated artifact refs configured starter-pack first-run refs, behavior traces, Dream skill candidates, positive-signal evidence, and external-pull evidence, then passed after `doctor --live` counted distinct inspectable references.
- `bun test apps/cli/src/commands/doctor.test.ts -t "describes detailed v1 evidence requirements in next actions"` later failed because next actions did not name distinct counted evidence refs, then passed after the actions named distinct first-run refs, traces, skill candidates, positive signals, and external pull evidence.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 dream internal skill evidence to be private-fork only"` first failed because an internal skill artifact without private-fork-only proof configured `v1.dreamArtifacts`, then passed after `doctor --live` required private-fork and canonical-absence evidence.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 dream internal and public skill evidence to be distinct"` first failed because one reused skill artifact configured both the internal and public Dream skills, then passed after `doctor --live` required distinct inspectable internal and public skill evidence.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 dream trace evidence to include source run and annotations"` first failed because trace-only Dream evidence configured `v1.dreamArtifacts`, then passed after `doctor --live` required source-run and annotation evidence for the auto-extracted trace.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 real goals to use distinct goal IDs and run evidence"` first failed because five dated entries with one repeated goal ID and evidence artifact configured `v1.realGoals`, then passed after `doctor --live` required five distinct goal IDs and five distinct inspectable run evidence refs.
- `bun test apps/cli/src/commands/doctor.test.ts -t "describes detailed v1 evidence requirements in next actions"` later failed because the real-goals action did not name distinct goals and evidence, then passed after the action text did.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 real goals to be named coding goals"` first failed because five dated run-evidence refs without goal text or coding domain configured `v1.realGoals`, then passed after `doctor --live` required each real goal to be named and marked as `coding`.
- `bun test apps/cli/src/commands/doctor.test.ts -t "rejects future-dated v1 real goals"` first failed because future real-goal dates and a future two-week follow-up configured `v1.realGoals` and `v1.twoWeekImprovement`, then passed after `doctor --live` rejected real-goal and follow-up dates later than the current readiness-check time.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 starter pack counts to cite installed skills and traces"` first failed because `v1.starterPack` configured from bare skill/trace counts plus curriculum and first-run refs, then passed after `doctor --live` required distinct installed skill and trace references matching the counts.
- `bun test apps/cli/src/commands/doctor.test.ts -t "describes detailed v1 evidence requirements in next actions"` later failed because the starter-pack action did not name installed starter skill/trace references, then passed after the action text did.
- `bun test apps/cli/src/commands/doctor.test.ts -t provider` first failed because one reused provider-smoke artifact configured `v1.providerSmokes`, then passed after `doctor --live` required distinct Anthropic, OpenRouter, and private OpenAI-compatible smoke evidence.
- `bun test apps/cli/src/commands/doctor.test.ts -t "describes detailed v1 evidence requirements in next actions"` later failed because the provider-smokes action did not name distinct evidence, then passed after the action text did.
- `bun test apps/cli/src/commands/doctor.test.ts -t "public contribution"` first failed because three external pull/use evidence files attributed to one repeated agent configured `v1.publicContribution`, then passed after `doctor --live` required three distinct other-agent pull/use evidence records.
- `bun test apps/cli/src/commands/doctor.test.ts -t "requires v1 public contribution positive signals from distinct agents"` first failed because five positive-signal artifacts without distinct signal-agent identities configured `v1.publicContribution`, then passed after `doctor --live` required five distinct positive-signal agent/evidence records.
- `bun test apps/cli/src/commands/doctor.test.ts` now also checks that public-contribution next-action guidance names other-agent pull/use records.
- `bun test apps/cli/src/commands/doctor.test.ts`: 62 tests passed, 0 failed, 282 assertions.
- `bun test scripts/reference-docs.test.ts`: 15 tests passed, 0 failed, 464 assertions.
- `git diff --check` in `the-agent`: exits 0.
- `bun run lint` in `the-world`: world validator reports 3 domains, 40 skills, 6 anti-patterns, 7 traces, 6 runs, 3 curricula, 3 rubrics, 3 exemplars, and 1 contributor.
- `bun run typecheck` in `the-world`: TypeScript passed.
- `bun run test` in `the-world`: 26 tests passed, 0 failed, 208 assertions.
- `bun run build` in `the-world`: 8 required files present.
- Latest agent local-gate commits: `ce950ff chore(agent): validate live doctor urls`, `9b351dd chore(agent): validate live setup urls`, `5124f1b chore(agent): preflight credential smoke URL`, `5756a20 docs(cli): describe live setup dry run`, `b6274bf docs(agent): align live verification sequence`, `e8ce4e1 docs(cli): point direct usage at main entrypoint`, `62ae977 fix(cli): split executable entrypoint`, `bad8638 docs(agent): add cli entrypoint implementation plan`, `bc346d1 docs(agent): specify cli entrypoint split`, `74a240e fix(agent): exempt live env templates from permission check`, `9659ec2 fix(agent): count private provider env readiness`, `b21d34b fix(agent): check live env file permissions`, `8395aa2 fix(agent): require internal credential value readiness`, `e71e5f1 docs(agent): use env vars in credential readiness guide`, `036be1e fix(agent): require credential master key readiness`.
- Latest world local-gate commits: `6df8516 ci(world): validate contribution proposals`, `091b80c ci(world): validate domain learning artifacts`, `be012df ci(world): validate anti-pattern contributions`, `fbec50b docs(world): require full gate in PR templates`, `4478b27 ci(world): validate generated maintenance PRs`, `ad46110 ci(world): run full checkpoint before auto-merge`, `d8dc698 docs(world): require build before publishing`, `9474e60 ci(world): build during manual revalidation`, `788ad9b ci(world): add full checkpoint workflow`.

## 2026-05-10 Live Setup Refresh

This section captured the May 10 live setup state. It has since been superseded
by the May 11 resume updates below, which configured durable starter-pack
evidence, durable canonical/private world subscriptions, non-secret
Anthropic/OpenRouter model metadata, and a local credential-store master key.

The GitHub and repository setup blockers have been cleared since the earlier audit entries. Current evidence:

- Agent repository: `https://github.com/idanmann10/vivarium-agent`.
- World repository: `https://github.com/idanmann10/vivarium-world`.
- Private world mirror: `https://github.com/idanmann10/vivarium-world-private`.
- Phase 0 RFC Discussion: `https://github.com/idanmann10/vivarium-world/discussions/1`.
- Latest agent main CI for `ce950ff94e71756cd01a3318f9d2284b313a029b`: success, `https://github.com/idanmann10/vivarium-agent/actions/runs/25643528842`.
- Latest world main CI for `6df8516ddf88d877b6cd5a3700fa3a4335cf5993`: success, `https://github.com/idanmann10/vivarium-world/actions/runs/25641578266`.
- `git rev-parse HEAD` in `the-agent`: `ce950ff94e71756cd01a3318f9d2284b313a029b`.
- `git rev-parse HEAD` in `the-world`: `6df8516ddf88d877b6cd5a3700fa3a4335cf5993`.
- Latest agent `main` CI now includes the live setup and live doctor URL validation hardening slices.

Fresh live-readiness command:

```bash
bun apps/cli/src/main.ts doctor --live \
  --env-file live-readiness.local.env \
  --agent-root . \
  --world-root ../the-world
```

Fresh result from the May 10 run: `ok:false`. Configured/ok/installed checks included `liveEnvFile.permissions`, agent/world names, agent/world remotes, world subscription path, canonical/private world refs, provider profile names, internal credential name, GitHub token environment, GitHub owner/repository/category metadata, GitHub auth, the Phase 0 Discussion, agent/world CI, Docker, Docker Compose, and `v1.evidencePath`.

The remaining non-passing checks are:

- Provider setup: `provider.env:placeholder`, `provider.anthropic:placeholder`, `provider.anthropicModel:missing`, `provider.anthropicContextWindow:missing`, `provider.openrouter:placeholder`, `provider.openrouterModel:missing`, `provider.openrouterBaseUrl:missing`, `provider.openrouterContextWindow:missing`, `provider.privateOaiCompat:placeholder`, `provider.privateOaiCompatContextWindow:missing`, `provider.profilesPath:unavailable`. The May 11 resume later configured the non-secret Anthropic/OpenRouter model/base/context values, so the current provider metadata blockers are narrower than this May 10 list.
- Provider smokes: `provider.anthropicSmoke:missing`, `provider.openrouterSmoke:missing`, `provider.privateOaiCompatSmoke:missing`.
- Internal credential setup: `credentials.path:unavailable`, `internalApi.credentialValue:placeholder`, `internalApi.healthUrl:placeholder`, `credentials.smoke:missing`. The ignored local env file now contains a generated local credential-store master key, so `doctor --live` reports `credentials.masterKey:configured`; the key value is intentionally not recorded.
- V1 evidence at that time: `v1.starterPack:missing`, `v1.realGoals:missing`, `v1.providerSmokes:missing`, `v1.internalCredentialSmoke:missing`, `v1.worldSubscriptions:missing`, `v1.behaviorLoop:missing`, `v1.dreamArtifacts:missing`, `v1.publicContribution:missing`, `v1.publishedArtifacts:missing`, `v1.curationStats:missing`, `v1.twoWeekImprovement:missing`. The May 11 resume later configured `v1.starterPack` and `v1.worldSubscriptions`.

The current `doctor --live` next actions now route setup-created local files through the safer aggregate command:

```bash
bun "apps/cli/src/main.ts" live setup --env-file "live-readiness.local.env" --confirm-write
```

That command still requires real provider keys, model/base/context values, the internal API credential, the credential-store master key, and the internal health URL. The evidence manifest exists as a skeleton, but its v1 sections are intentionally empty until real live runs, PRs, Discussions, workflow runs, stats, and other-agent evidence exist.

## Next Required External Inputs

1. Anthropic and OpenRouter API keys; private OpenAI-compatible provider credentials, model choice, base URL, and context-window value.
2. Internal API credential value and internal API health URL. The local credential-store master key is configured in the ignored local env file, but the encrypted store and smoke cannot be created until the real credential value and health URL exist.
3. Successful live provider smoke results for Anthropic, OpenRouter, and the private OpenAI-compatible endpoint.
4. Successful internal API credential smoke through the encrypted credential store.
5. Live v1 evidence manifest populated from inspectable run, PR, Discussion, workflow, stats, contributor-profile, and other-agent evidence.
6. Live run window for five real coding goals and the required fourteen-day-or-later follow-up measurement.

Until those are available and verified, do not mark the thread goal complete.

## 2026-05-11 Resume Update

The resume request added a new explicit constraint: check current Claude Managed Agents and Claude Code agent docs so future Vivarium agent-building work keeps Claude's type and file-format boundaries in mind.

Sources checked:

- Claude Managed Agents overview: `https://platform.claude.com/docs/en/managed-agents/overview`.
- Define your agent: `https://platform.claude.com/docs/en/managed-agents/agent-setup`.
- Managed Agent tools: `https://platform.claude.com/docs/en/managed-agents/tools`.
- Managed Agent skills: `https://platform.claude.com/docs/en/managed-agents/skills`.
- Managed Agent MCP connector: `https://platform.claude.com/docs/en/managed-agents/mcp-connector`.
- Claude Code subagents: `https://code.claude.com/docs/en/sub-agents`.
- Claude Code agent teams: `https://code.claude.com/docs/en/agent-teams`.

Persisted local artifacts:

- `docs/reference/claude-agent-formats.md` records the Claude Managed Agents `Agent` / `Environment` / `Session` / `Events` split, agent config fields (`name`, `model`, `system`, `tools`, `mcp_servers`, `skills`, `multiagent`, `description`, `metadata`), the `managed-agents-2026-04-01` beta header, model object examples such as `claude-opus-4-7`, skill source shapes, MCP secret split, current Claude/OpenRouter model metadata used for non-secret provider defaults, Claude Code subagent YAML frontmatter including `maxTurns`, `memory`, `effort`, `background`, `color`, and `initialPrompt`, subagent scope priority, `isolation: worktree`, agent-team reuse of subagent types, and `Agent(worker, researcher)` spawn allowlists.
- `packages/core/src/types/claude-agent-format.ts` exports `CLAUDE_MANAGED_AGENTS_BETA_HEADER`, `CLAUDE_AGENT_TOOLSET_TYPE`, `ClaudeManagedAgentCreateRequest`, and `ClaudeCodeSubagentFrontmatter` so future code has a typed compatibility surface instead of relying on prose only.
- `docs/README.md` links the new reference page.
- `scripts/reference-docs.test.ts` now guards the Claude format reference and durable live-readiness artifact paths so they stay discoverable.
- The ignored local env file now points `VIVARIUM_V1_EVIDENCE_PATH` at `/Users/idanmann/.codex/memories/vivarium-v1-evidence.json` so the partially filled, non-secret evidence manifest is durable across shell cleanup; it currently contains verified canonical/private world subscription refs plus local starter-pack init/run evidence. It also points `VIVARIUM_WORLD_SUBSCRIPTIONS_PATH`, `VIVARIUM_PROVIDER_PROFILES_PATH`, and `VIVARIUM_CREDENTIALS_PATH` at durable files under `/Users/idanmann/.codex/memories/`. Only the world-subscription and v1 evidence files exist so far; provider profile and encrypted credential files still require real external inputs before they can be created.

Local doctor hardening completed while resuming:

- `doctor --live` now reads saved provider profiles into a map and compares each configured profile against the same metadata shape written by `live setup`.
- The Anthropic live profile must match `kind: "anthropic"`, `apiKeyEnv: "ANTHROPIC_API_KEY"`, configured model/context window, capabilities `["chat", "tools"]`, and `costClass: "expensive"`.
- The OpenRouter and private OpenAI-compatible profiles must match `kind: "openai-compat"`, their configured API-key env, configured model/base URL/context window, capabilities `["chat", "json_mode"]`, and `costClass: "medium"`.
- Smoke probes are skipped when saved profile names are unavailable or when saved profile metadata mismatches live setup env, preventing false live-readiness progress.

Fresh local verification:

- `bun test apps/cli/src/commands/doctor.test.ts`: 74 tests passed.
- `bun test scripts/reference-docs.test.ts`: 17 tests passed.
- `bun run typecheck`: passed.
- `bun run test`: 298 tests passed.
- `bun run lint`: scanned 198 TypeScript files; Oxlint reported 0 warnings and 0 errors.
- `bun run build`: 9 entrypoints present.
- `bun run format:check`: all matched files formatted.
- `bun run knip`: passed.
- `git diff --check`: passed.
- `the-world bun run lint`: world validator reported 3 domains, 40 skills, 6 anti-patterns, 7 traces, 6 runs, 3 curricula, 3 rubrics, 3 exemplars, and 1 contributor.
- `the-world bun run typecheck`: passed.
- `the-world bun run test`: 26 tests passed.
- `the-world bun run build`: 8 required files present.

Fresh live-readiness command:

```bash
bun apps/cli/src/main.ts doctor --live \
  --env-file live-readiness.local.env \
  --agent-root /Users/idanmann/Vivarium/the-agent \
  --world-root /Users/idanmann/Vivarium/the-world
```

Fresh result: `ok:false`. Passing setup checks include env-file permissions, final agent/world names, remotes, canonical/private world subscription refs, provider profile names, GitHub auth/Discussion/CI, Docker, Docker Compose, and evidence manifest path. Remaining blockers:

- Provider setup: `provider.env:placeholder`, `provider.anthropic:placeholder`, `provider.openrouter:placeholder`, `provider.privateOaiCompat:placeholder`, `provider.privateOaiCompatContextWindow:placeholder`, `provider.profilesPath:unavailable`. The non-secret Anthropic and OpenRouter model/base/context values are configured in the ignored local env file from the 2026-05-11 official model metadata check.
- Provider smoke probes: `provider.anthropicSmoke:missing`, `provider.openrouterSmoke:missing`, `provider.privateOaiCompatSmoke:missing`.
- Internal credential setup: `credentials.path:unavailable`, `internalApi.credentialValue:placeholder`, `internalApi.healthUrl:placeholder`, `credentials.smoke:missing`. `credentials.masterKey:configured` because the ignored local env file contains a generated local credential-store master key.
- V1 evidence manifest sections: `v1.starterPack:configured`, `v1.worldSubscriptions:configured`, `v1.behaviorLoop:configured`; remaining blockers are `v1.realGoals:missing`, `v1.providerSmokes:missing`, `v1.internalCredentialSmoke:missing`, `v1.dreamArtifacts:missing`, `v1.publicContribution:missing`, `v1.publishedArtifacts:missing`, `v1.curationStats:missing`, and `v1.twoWeekImprovement:missing`.

Fresh `live setup --env-file live-readiness.local.env` dry run after local private-context-window placeholder alignment:

- Missing env: none.
- Placeholder env: `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `VIVARIUM_OAI_COMPAT_API_KEY`, `VIVARIUM_OAI_COMPAT_MODEL`, `VIVARIUM_OAI_COMPAT_BASE_URL`, `VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW`, `VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE`, and `VIVARIUM_INTERNAL_API_HEALTH_URL`.
- `written:false`; provider profile and encrypted credential files were not created.

Starter-pack evidence update:

- Ran a durable local init at `/Users/idanmann/.codex/memories/vivarium-v1-starter-pack-2026-05-11.db` using the current local coding world.
- The init installed 20 coding starter skills, discovered 3 coding starter traces, found `domains/coding/curriculum.md`, and returned the expected provider/credential prompts.
- Two local first runs succeeded with the initialized state and referenced starter-pack skills/traces in transparency output.
- Non-secret evidence records were written to `/Users/idanmann/.codex/memories/vivarium-v1-starter-run-1.md` and `/Users/idanmann/.codex/memories/vivarium-v1-starter-run-2.md`.
- A fresh `doctor --live --env-file live-readiness.local.env --agent-root /Users/idanmann/Vivarium/the-agent --world-root /Users/idanmann/Vivarium/the-world` reported `v1.starterPack:configured`.

Real-goal evidence update:

- Added five inspectable real coding goal records to the durable v1 evidence manifest.
- Evidence artifacts: `/Users/idanmann/.codex/memories/vivarium-v1-real-goal-2-phase-1-runtime-slice.md`, `/Users/idanmann/.codex/memories/vivarium-v1-real-goal-3-cli-init-starter-pack.md`, `/Users/idanmann/.codex/memories/vivarium-v1-real-goal-4-live-evidence-manifest.md`, `/Users/idanmann/.codex/memories/vivarium-v1-real-goal-5-saved-profile-smoke-gates.md`, and `/Users/idanmann/.codex/memories/vivarium-v1-real-goal-1-claude-agent-format-contract.md`.
- A fresh manifest check found five real-goal records and zero missing local evidence artifacts.
- A fresh `doctor --live --env-file live-readiness.local.env --agent-root /Users/idanmann/Vivarium/the-agent --world-root /Users/idanmann/Vivarium/the-world` still reports `v1.realGoals:missing`, as expected, because the current real-goal evidence spans 2026-05-09 through 2026-05-11 rather than at least seven days.

Behavior-loop evidence update:

- Added local behavior-loop evidence artifacts under `/Users/idanmann/.codex/memories/` for unfamiliar-territory anti-pattern lookup, similar workflow trace reads, Monitor tool-failure detection, Recover re-plan, ordered destructive hold/escalation/confirmation/continuation, and refusal.
- A fresh local evidence-reference check found 15 behavior-loop references and zero missing local evidence files.
- A fresh `doctor --live --env-file live-readiness.local.env --agent-root /Users/idanmann/Vivarium/the-agent --world-root /Users/idanmann/Vivarium/the-world` reports `v1.behaviorLoop:configured`.

Completion decision: still not complete. The remaining requirements require real provider/internal credentials, successful live smoke calls, populated inspectable v1 evidence, cross-install/other-agent contribution evidence, and a fourteen-day-or-later follow-up measurement.

## 2026-05-11 Remote Handoff

The local Claude-format and live-readiness hardening slice has been pushed to the existing feature branch:

- Branch: `phase-1-runtime-slice`.
- Remote: `origin/phase-1-runtime-slice`. The read-only pre-commit handoff check returned `c12e1bd3a819015df080cd6d24d7d6876dbba4bf`; verify the exact latest remote head with `git ls-remote origin refs/heads/phase-1-runtime-slice` because each audit commit changes this value.
- Recent pushed work on the branch includes the Claude agent-format reference, durable v1 evidence manifest handoff, starter-pack evidence status, current Claude/OpenRouter provider defaults, completion-checklist tightening, and remote-handoff bookkeeping.
- Fresh correct read-only open PR check: `gh api 'repos/idanmann10/vivarium-agent/pulls?state=open&head=idanmann10:phase-1-runtime-slice'` returned `[]`.
- Fresh correct read-only Actions check: `gh api 'repos/idanmann10/vivarium-agent/actions/runs?branch=phase-1-runtime-slice&per_page=5'` returned `{"total_count":0,"workflow_runs":[]}`. This is expected from `.github/workflows/ci.yml`, which runs on `pull_request` and pushes to `main`, not on arbitrary feature-branch pushes.

Do not treat the pushed branch as CI-verified until a PR is opened or the branch is otherwise run through the full local/remote gates. Opening a draft PR is externally visible and requires explicit user approval.
