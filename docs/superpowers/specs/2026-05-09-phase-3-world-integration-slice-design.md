# Phase 3 World Integration Slice Design

## Context

Phase 3 closes the cultural loop: artifacts produced by one install are proposed or published to a world, then retrieved by another install. The full roadmap calls for GitHub PRs, trust-weighted auto-merge, private worlds, validation workflows, stats, stale scans, regression archiving, featured picks, and anti-gaming defenses.

## Approach

Build a deterministic local version of the same contracts:

- `packages/world/src/push.ts` writes proposed skills, traces, runs, and anti-patterns to a local world's `proposals/` directory.
- `packages/world/src/runs.ts` and `traces.ts` publish local artifacts into `runs/` and `domains/<domain>/traces/`.
- `packages/world/src/retrieve.ts` searches multiple local worlds in priority order and preserves the source world in results.
- `the-world` scripts become concrete enough to validate files, compute stats, flag stale skills, archive regression-voted artifacts, and list held PR placeholders.
- E2E test simulates two installs: install A proposes a skill into a local world fixture; install B retrieves it through multi-world search and sees a higher procedural hit count.

## Non-Goals

- No live GitHub API calls.
- No real auto-merge.
- No independent agent fingerprinting beyond local metadata fields.

## Success Criteria

- Local proposal writer creates structurally valid world artifacts.
- Local publish run and trace helpers create files accepted by validators.
- Multi-world retrieval returns artifacts from all subscribed worlds with source labels.
- `the-world` scripts have tests for stats and regression archive behavior.
- `tests/e2e-world-integration.test.ts` verifies local cultural transmission.
- Gates pass in both repos.
