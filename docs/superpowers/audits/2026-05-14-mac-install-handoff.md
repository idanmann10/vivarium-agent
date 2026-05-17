# Mac Install Handoff Audit

## Objective Restated

Provide a command that installs Vivarium locally on the Mac, starts the local
agent daemon, and leaves the operator with a clear setup walkthrough and an
honest production-readiness boundary.

## Install Command

Use the stable public `main` installer after PR #26 lands:

```bash
curl -fsSL https://raw.githubusercontent.com/idanmann10/vivarium-agent/main/scripts/install.sh | VIVARIUM_DAEMON=launchd bash
```

For the current pre-main review branch, generate the branch-pinned handoff from
the checkout you are validating:

```bash
vivarium launch handoff
```

It prints a command shaped like this, with the installer URL pinned to the
current checkout commit instead of a stale value copied from this audit:

```bash
curl -fsSL https://raw.githubusercontent.com/idanmann10/vivarium-agent/<current-commit>/scripts/install.sh | \
  VIVARIUM_AGENT_REF=codex/local-agent-production-ready \
  VIVARIUM_DAEMON=launchd \
  bash
```

The command installs the agent checkout at `~/.vivarium/vivarium-agent`, the
canonical world checkout at `~/.vivarium/the-world`, the CLI command at
`~/.local/bin/vivarium`, and the LaunchAgent at
`~/Library/LaunchAgents/com.vivarium.agent.daemon.plist`.

## Verified Evidence

| Requirement | Evidence | Status |
| --- | --- | --- |
| Stable installer can be copied from public `main` | `apps/cli/src/commands/launch.test.ts` and `apps/cli/src/dispatcher.test.ts` cover the `main` install command without `VIVARIUM_AGENT_REF`; `scripts/install.test.ts` covers explicit branch pinning only as an override | Complete |
| Branch-pinned dry-runs stay clean | `scripts/install.test.ts` covers `VIVARIUM_AGENT_REF` dry-runs and requires the output to avoid leaking `fatal:` Git probes for a checkout that dry-run mode only pretended to clone | Complete |
| Stable reinstalls recover from old branch-pinned checkouts | `scripts/install.test.ts` creates a checkout whose active branch tracks deleted `codex/hermes-style-quick-setup`, then verifies a no-ref reinstall returns it to `main` | Complete |
| Fresh installs prefill safe public metadata | `scripts/install.test.ts` covers GitHub URL inference for `--github-owner`, `--agent-repo`, `--world-repo`, and `--canonical-world-ref`; installed `bash scripts/install.sh --dry-run` shows those inferred arguments for the public repos | Complete |
| Missing Git recovery is copyable | `scripts/install.test.ts` covers the missing-Git dependency path and requires the installer to print `xcode-select --install` plus the instruction to rerun the Vivarium installer | Complete |
| Missing Bun recovery is copyable | `scripts/install.test.ts` covers the default missing-Bun dependency path and a missing custom `VIVARIUM_BUN_PATH`, requiring the installer to print `curl -fsSL https://bun.sh/install \| bash` plus the instruction to reload the shell and rerun the Vivarium installer | Complete |
| Missing LaunchAgent runtime recovery is copyable | `scripts/install.test.ts` covers the `VIVARIUM_DAEMON=launchd` path when `launchctl` is unavailable and requires the installer to print the missing `launchctl`, explain the macOS LaunchAgent requirement, and tell the operator to rerun without `VIVARIUM_DAEMON=launchd` if needed | Complete |
| Invalid daemon host/port values fail before install work or daemon start | `packages/core/src/daemon-config.test.ts` covers the shared TypeScript daemon host/port parser so CLI handoffs and direct daemon startup use the same rules; `scripts/install.test.ts` covers the `VIVARIUM_DAEMON=launchd` path with invalid `VIVARIUM_DAEMON_HOST`, trailing-dot `VIVARIUM_DAEMON_HOST`, invalid `VIVARIUM_DAEMON_PORT`, and leading-zero `VIVARIUM_DAEMON_PORT` values, requires the installer to print the invalid value, require a hostname or IPv4 address for hosts, require an integer from 1 to 65535 for ports, and stop before clone/update work; `apps/cli/src/dispatcher.test.ts` also requires `vivarium launch handoff --daemon-host` and `vivarium launch handoff --daemon-port` to reject invalid values before printing a broken handoff; `apps/daemon/src/main.test.ts` requires direct daemon startup config to reject invalid `VIVARIUM_DAEMON_HOST` values | Complete |
| Existing installs keep updating from GitHub | `scripts/install.test.ts` covers existing checkout remote normalization; the real installed checkout has `origin` set to `https://github.com/idanmann10/vivarium-agent.git`, and a fresh `vivarium update` completed `git pull --ff-only` plus `/Users/idanmann/.bun/bin/bun install --frozen-lockfile` | Complete |
| Installed CLI wrapper uses the resolved Bun path | The branch-pinned installer was rerun on this Mac, and `/Users/idanmann/.local/bin/vivarium` now executes `/Users/idanmann/.bun/bin/bun apps/cli/src/main.ts "$@"` instead of relying on `bun` being on `PATH` | Complete |
| Real Mac installed checkout tracks the reviewed branch | Installed checkout `~/.vivarium/vivarium-agent` is on branch `codex/local-agent-production-ready` with a clean status after the branch-pinned installer refresh; `vivarium launch handoff` prints the exact current commit-pinned installer URL for the checkout being validated | Complete |
| Exact copy-paste install command works | The stable `curl -fsSL .../main/scripts/install.sh \| VIVARIUM_DAEMON=launchd bash` command remains the public handoff; branch-pinned installs are covered for pre-main validation while PR #26 is under review | Complete |
| CLI walkthrough explains the Mac daemon step | Installed `vivarium help` keeps the first-run path focused on `vivarium local` and `vivarium local run`, while still exposing `vivarium daemon smoke --status-url http://127.0.0.1:8787/status` for LaunchAgent verification | Complete |
| LaunchAgent uses the resolved Bun path | `/Users/idanmann/Library/LaunchAgents/com.vivarium.agent.daemon.plist` runs `/Users/idanmann/.bun/bin/bun apps/daemon/src/main.ts` with `VIVARIUM_WORLD_ROOT=/Users/idanmann/.vivarium/the-world` | Complete |
| Daemon is running | `vivarium daemon smoke --status-url http://127.0.0.1:8787/status` returned `Status: ok` | Complete |
| Local loop runs after install | Installed `/Users/idanmann/.local/bin/vivarium local run` is the current shorthand for the validated local run path and defaults to the `build a tiny local agent` goal with the `local-agent` identity; fresh installed smoke `run-1779017589869-190` recorded local-provider success, validation score `0.8`, 4 consulted skills, 2 consulted traces, and a matching `vivarium status` receipt | Complete |
| Status next commands preserve explicit paths | Installed custom-path smoke on `run-1779009935614-653` showed status next commands preserve explicit `--state-path` and `--live-env-path` values: `vivarium status --state-path <temp>/state.db --live-env-path <temp>/live-readiness.local.env` kept those values in its next `vivarium local run` command, and used `vivarium connect --env-file <temp>/live-readiness.local.env` for the matching live handoff | Complete |
| focused help smokes match the Mac path | Installed `vivarium local run --help`, `vivarium local --help`, and `vivarium status --help` render focused run/setup/status usage, path flags, provider-profile/status/proof follow-ups, and no longer fall back to the global command table | Complete |
| Branch-pinned review unblock stays safe | Branch-pinned `vivarium launch handoff` says `Invite one eligible non-author reviewer when GitHub reports REVIEW_REQUIRED.`, prints `gh api -X PUT repos/idanmann10/vivarium-agent/collaborators/REVIEWER_GITHUB_USERNAME -f permission=push`, prints `gh pr edit PR_NUMBER --repo idanmann10/vivarium-agent --add-reviewer REVIEWER_GITHUB_USERNAME`, supports `vivarium launch handoff --pr-number 26 --reviewer REVIEWER_GITHUB_USERNAME` for exact PR commands, and warns not to lower branch protection or self-approve just to merge | Complete |
| Local code gates pass | `bun run lint`, `bun run typecheck`, `bun run build`, `bun run knip`, `bun run public-release:scan`, `bun run format:check`, `bun run dependency:audit`, `git diff --check`, and `bun test` passed; the dependency audit reported `No vulnerabilities found`, and the full test suite reported `562 pass, 0 fail, 4566 expect calls` after the daemon host/port, branch-pinned dry-run, pre-main operator handoff cleanup, and live env-file run cleanup | Complete |
| PR checks pass | PR #26 has successful `verify`, `changeset`, `Analyze JavaScript and TypeScript`, and CodeQL checks at the validated PR head from this audit; auto-merge is enabled and still blocked only by required review | Complete |
| Launch security posture is verified | `bun run launch:security-audit` returned `ok:true` for public agent/world repos, enabled branch protection, enabled secret scanning and push protection, and zero open Dependabot, secret scanning, or code scanning alerts | Complete |

## Remaining Blockers

Do not claim full v1 production readiness yet. A fresh installed
`vivarium doctor --live` using the default private setup file still reports
`36 passing, 17 blocked`.

The matching `vivarium proof --details` evidence still reports
`4 passing, 4 blocked`. The current tracker is GitHub issue #9,
`Live/v1 production readiness blockers`, which now treats open-source/security
launch as cleared and tracks only the remaining review, provider, credential,
and v1 evidence gates.

The remaining blockers require:

- Real provider keys for Anthropic/OpenRouter, the private OpenAI-compatible provider
  key/base/model/context/profile, and smoke transcripts for all three provider
  paths.
- An encrypted internal credential store and successful internal credential
  smoke.
- Real v1 evidence for public contribution, published artifacts, curation stats,
  and the required two-week improvement evidence.

The public agent repository and public world repository are public, PR #26 has
auto-merge enabled but still needs the required review, and branch protection remained intact.
The safe unblock is to invite one eligible non-author reviewer and request review:

```bash
vivarium launch handoff --pr-number 26 --reviewer REVIEWER_GITHUB_USERNAME
gh api -X PUT repos/idanmann10/vivarium-agent/collaborators/REVIEWER_GITHUB_USERNAME -f permission=push
gh pr edit 26 --repo idanmann10/vivarium-agent --add-reviewer REVIEWER_GITHUB_USERNAME
```

Do not lower branch protection or self-approve just to merge. The live readiness
gate is intentionally still blocked until real secrets and inspectable v1
evidence exist.

## Operator Handoff

Until PR #26 lands, use the branch-pinned pre-main handoff. From the
checkout being validated, run:

```bash
vivarium launch handoff --pr-number 26 --reviewer REVIEWER_GITHUB_USERNAME
```

Then copy the printed branch-pinned install command. It is shaped like:

```bash
curl -fsSL https://raw.githubusercontent.com/idanmann10/vivarium-agent/<current-commit>/scripts/install.sh | \
  VIVARIUM_AGENT_REF=codex/local-agent-production-ready \
  VIVARIUM_DAEMON=launchd \
  bash
```

After PR #26 lands, use the stable main installer.

```bash
curl -fsSL https://raw.githubusercontent.com/idanmann10/vivarium-agent/main/scripts/install.sh | VIVARIUM_DAEMON=launchd bash
```

Then run:

```bash
vivarium local run
vivarium daemon smoke --status-url http://127.0.0.1:8787/status
vivarium connect
vivarium doctor --live
```

Expected local result: the run succeeds, daemon smoke reports `Status: ok`, and
blocked live setup points at `~/.vivarium/live/live-readiness.local.env` plus
the production input groups still needed. Full v1 live readiness is
intentionally not claimed until `doctor --live` reports ready.
