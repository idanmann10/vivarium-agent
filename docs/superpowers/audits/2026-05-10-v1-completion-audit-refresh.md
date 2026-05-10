# V1 Completion Audit Refresh

## Objective Restated

Continue following `/Users/idanmann/Vivarium/goal.md` until the project is genuinely done:

- Build `the-agent`: local-first runtime, memory, providers, tools, primitives, daemon, CLI, tests, and docs.
- Build `the-world`: GitHub-hosted culture repo with seed content, validation, stats, trust gates, and maintenance workflows.
- Prove the v1 loop from `goal.md`: install/init with starter pack, live providers and credentials, canonical plus private worlds, real goals, Dream outputs, public/private contributions, canonical-world PR/auto-merge, cross-install pull/use, featured picks, stats, and contributor profile evidence.
- Preserve recovery artifacts: specs, plans, audits, command evidence, and commits.

## Current Status

Not complete. Local implementation and local test gates are strong, including agent dependency gates, world CI/revalidation build coverage, anti-pattern validation coverage, domain learning artifact validation coverage, auto-merge checkpoint coverage, generated-maintenance-PR checkpoint coverage, and full-gate PR template guidance, but the v1 loop still lacks live external proof. The current blockers are not proxy signals; they are direct failures from `doctor --live` and direct empty Git remote inspections.

## Prompt-To-Artifact Checklist

| Requirement from `goal.md` | Current evidence | Status |
| --- | --- | --- |
| Phase 0: both repos compile/lint/test/build | Prior full gates plus latest `the-agent` and `the-world` local gate runs in this thread; agent CI/release now include `bun run knip`; world CI/manual revalidation, anti-pattern validation, domain learning artifact validation, auto-merge, generated maintenance PRs, and PR templates now include the current local checkpoints | Complete locally |
| Phase 0: world has seed content of every primitive | `the-world bun run lint` previously reported 3 domains, 40 skills, 6 anti-patterns, 7 traces, 6 runs, 3 curricula, 3 rubrics, 3 exemplars, 1 contributor; domain learning artifact validator covers curricula, rubrics, and exemplars | Complete locally |
| Phase 0: one Discussion open demonstrating RFC format | RFC proposal and Discussion command exist, but there is no configured GitHub remote or repository/category ID | Incomplete externally |
| Phase 1: installed agent can run a real goal with providers and credential | CLI/provider/credential paths are implemented and tested with local/mocked adapters; no Anthropic/OpenRouter/private OAI-compatible credentials or internal API target are configured | Incomplete externally |
| Phase 1: anti-pattern lookup, curriculum advance, confidence buckets | Covered by local runtime, init, self-tool, and Dream/state tests in existing audit evidence | Complete locally |
| Phase 2: Dream produces anti-pattern, trace, publishable run, compounding eval | Covered by local Dream/eval tests in existing audit evidence | Complete locally |
| Phase 3: public/private world subscriptions and cross-install cultural transmission | Local transmission smoke and subscription registry paths exist; no canonical/private remote refs are configured | Incomplete externally |
| Phase 3: public skill PR, validator signals, auto-merge, other agents pull/use it | GitHub client, PR helper, signal, trust, full-checkpoint auto-merge workflow logic, and full-gate contribution templates are locally tested; no live GitHub PR/workflow/auto-merge run exists | Incomplete externally |
| Phase 3: anti-pattern, trace, and run published and read by another agent | Local publish/read paths exist; world run, trace, and anti-pattern validators are locally tested; no live canonical-world publish/read loop exists | Incomplete externally |
| Phase 3: featured pick and STATS concentration | World scripts, checked-in stats, CI build gate, manual revalidation build gate, and generated maintenance PR post-mutation gates are locally verified; live maintainer workflow execution and live telemetry are unverified | Complete locally, incomplete live |
| V1 done: five real goals over a week and two-week measurable improvement | Synthetic/local tests only | Incomplete externally |
| Naming decision | `goal.md` still says `the-agent` and `the-world` are temporary names; `doctor --live` reports `agent.name:missing` and `world.name:missing` | Incomplete; requires user decision |
| Live readiness handoff | `docs/live-readiness.env.example`, `docs/guides/live-readiness.md`, `doctor --live --env-file`, and structured `nextActions` exist; copied `<...>` values now report as blockers | Complete locally |

## Fresh Evidence

- `git remote -v` in `the-agent`: no remotes printed.
- `git remote -v` in `the-world`: no remotes printed.
- `bun apps/cli/src/index.ts doctor --live --agent-root /Users/idanmann/Vivarium/the-agent --world-root /Users/idanmann/Vivarium/the-world`: `ok:false`.
- Real-env live blockers: final names, both remotes, world subscription path, canonical/private world refs, provider env, Anthropic/OpenRouter/private-compatible targets, provider profile metadata, encrypted credential metadata, internal API health URL, GitHub env/owner/repository/category metadata, and GitHub auth.
- Passing live checks: `docker:installed`, `docker.compose:installed`.
- `live-readiness.local.env` is intentionally absent in this checkout; filled copies are gitignored because they may contain provider keys, GitHub tokens, and internal API metadata.
- `bun apps/cli/src/index.ts doctor --live --env-file docs/live-readiness.env.example --agent-root /Users/idanmann/Vivarium/the-agent --world-root /Users/idanmann/Vivarium/the-world`: `ok:false` with copied template values classified as `:placeholder` or unavailable, not live-ready.
- Latest agent local-gate commits: `199b677 ci(agent): run knip before release`, `8fc8eba ci(agent): run knip dependency gate`, `1a3e7a4 chore(agent): enable knip dependency gate`.
- Latest world local-gate commits: `091b80c ci(world): validate domain learning artifacts`, `be012df ci(world): validate anti-pattern contributions`, `fbec50b docs(world): require full gate in PR templates`, `4478b27 ci(world): validate generated maintenance PRs`, `ad46110 ci(world): run full checkpoint before auto-merge`, `d8dc698 docs(world): require build before publishing`, `9474e60 ci(world): build during manual revalidation`, `788ad9b ci(world): add full checkpoint workflow`.

## Next Required External Inputs

1. Final product/repo names for agent and world.
2. GitHub owner plus canonical agent/world repository remotes.
3. Canonical world ref and private fork world ref.
4. GitHub token plus repository node ID and Discussion category node ID.
5. Anthropic, OpenRouter, and private OpenAI-compatible provider credentials/model choices.
6. Internal API credential value, credential store master key, credential name, and health URL.
7. Live run window for five real goals and later follow-up measurement.

Until those are available and verified, do not mark the thread goal complete.
