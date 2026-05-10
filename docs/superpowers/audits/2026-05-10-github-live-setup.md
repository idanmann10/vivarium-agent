# GitHub Live Setup Audit

## Objective Restated

Continue `goal.md` toward v1 by clearing the externally actionable GitHub setup blockers:

- Give the agent and world real GitHub repository targets.
- Publish current agent/world heads to GitHub.
- Enable the world RFC Discussion path.
- Register and verify GitHub Actions workflows.
- Preserve the remaining live blockers without claiming v1 completion.

## Evidence

| Requirement | Evidence | Status |
| --- | --- | --- |
| Agent repository exists with a real name | `https://github.com/idanmann10/vivarium-agent`, private, default branch `main` | Complete |
| Canonical world repository exists with a real name | `https://github.com/idanmann10/vivarium-world`, public, default branch `main` | Complete |
| Private world fork/mirror exists | `https://github.com/idanmann10/vivarium-world-private`, private, default branch `main` | Complete |
| Local remotes are configured | `the-agent` `origin` points to `vivarium-agent`; `the-world` `origin` points to `vivarium-world`; `the-world` `private` points to `vivarium-world-private` | Complete |
| Current work is published to GitHub | `the-agent` `phase-1-runtime-slice` and `main` include CI fix commit `755a98a`; `the-world` `phase-3-world-integration-slice` and `main` point at `6df8516` | Complete |
| World Discussions are enabled | `github smoke` reports `discussionsEnabled: true` for `idanmann10/vivarium-world` | Complete |
| Seed RFC Discussion exists | `https://github.com/idanmann10/vivarium-world/discussions/1` titled `RFC 0001: Phase 0 Bootstrap` | Complete |
| Agent workflows are registered | GitHub Actions workflow API reports 3 workflows for `vivarium-agent` | Complete |
| Public world workflows are registered | GitHub Actions workflow API reports 13 workflows for `vivarium-world` | Complete |
| Private world workflows are registered | GitHub Actions workflow API reports 13 workflows for `vivarium-world-private` | Complete |
| Agent CI is green | `https://github.com/idanmann10/vivarium-agent/actions/runs/25641932268` completed with `conclusion: success` on `main` | Complete |
| Public world CI is green | `https://github.com/idanmann10/vivarium-world/actions/runs/25641578266` completed with `conclusion: success` on `main` | Complete |
| Private world CI is green | `https://github.com/idanmann10/vivarium-world-private/actions/runs/25641578403` completed with `conclusion: success` on `main` | Complete |
| Agent CI has a regression guard for its sibling world dependency | `scripts/workflows.test.ts` requires `.github/workflows/ci.yml` to clone `vivarium-world` to `../the-world` before tests | Complete |
| Local verification for the CI fix | `bun run lint`, `bun run typecheck`, `bun run test`, and `git diff --check` passed in `the-agent` before pushing `755a98a` | Complete |
| Live readiness GitHub checks | Elevated `doctor --live --env-file live-readiness.local.env` reports `github.env:configured`, `github.owner:configured`, `github.repositoryId:configured`, `github.discussionCategoryId:configured`, and `github.auth:ok` | Complete |

## Remaining Blockers

The project is still not v1 complete. The latest elevated live doctor remains `ok: false` because these non-GitHub checks are not configured with real live values:

- Provider API keys for Anthropic, OpenRouter, and the private OpenAI-compatible endpoint.
- Provider profiles path and saved provider profiles.
- Encrypted credential store path and master key.
- Internal API credential value and health URL.
- Inspectable v1 evidence manifest for the real multi-run, Dream, public contribution, cross-install pull/use, curation, and two-week improvement loop.

Do not mark the thread goal complete until those blockers are resolved with real evidence and the v1 evidence manifest passes `doctor --live`.
