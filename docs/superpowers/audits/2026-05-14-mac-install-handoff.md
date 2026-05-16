# Mac Install Handoff Audit

## Objective Restated

Provide a command that installs Vivarium locally on the Mac, starts the local
agent daemon, and leaves the operator with a clear setup walkthrough and an
honest production-readiness boundary.

## Install Command

Use the stable public `main` installer:

```bash
curl -fsSL https://raw.githubusercontent.com/idanmann10/vivarium-agent/main/scripts/install.sh | VIVARIUM_DAEMON=launchd bash
```

The command installs the agent checkout at `~/.vivarium/vivarium-agent`, the
canonical world checkout at `~/.vivarium/the-world`, the CLI command at
`~/.local/bin/vivarium`, and the LaunchAgent at
`~/Library/LaunchAgents/com.vivarium.agent.daemon.plist`.

## Verified Evidence

| Requirement | Evidence | Status |
| --- | --- | --- |
| Stable installer can be copied from public `main` | `apps/cli/src/commands/launch.test.ts` and `apps/cli/src/dispatcher.test.ts` cover the `main` install command without `VIVARIUM_AGENT_REF`; `scripts/install.test.ts` covers explicit branch pinning only as an override | Complete |
| Stable reinstalls recover from old branch-pinned checkouts | `scripts/install.test.ts` creates a checkout whose active branch tracks deleted `codex/hermes-style-quick-setup`, then verifies a no-ref reinstall returns it to `main` | Complete |
| Fresh installs prefill safe public metadata | `scripts/install.test.ts` covers GitHub URL inference for `--github-owner`, `--agent-repo`, `--world-repo`, and `--canonical-world-ref`; installed `bash scripts/install.sh --dry-run` shows those inferred arguments for the public repos | Complete |
| Existing installs keep updating from GitHub | `scripts/install.test.ts` covers existing checkout remote normalization; the real installed checkout has `origin` set to `https://github.com/idanmann10/vivarium-agent.git`, and `vivarium update` completed `git pull --ff-only` plus `bun install --frozen-lockfile` | Complete |
| Real Mac installed checkout is current | Installed checkout `~/.vivarium/vivarium-agent` was moved to branch `main` at merge commit `9d21154` with a clean status after the installer follow-up | Complete |
| Exact copy-paste install command works | The stable `curl -fsSL .../main/scripts/install.sh \| VIVARIUM_DAEMON=launchd bash` command is the public handoff; the merge-commit-pinned installer for `9d21154` was used once to bridge raw URL propagation and switched the installed checkout to `main` | Complete |
| CLI walkthrough explains the Mac daemon step | Installed `vivarium help` keeps the first-run path focused on `vivarium local` and `vivarium local run`, while still exposing `vivarium daemon smoke --status-url http://127.0.0.1:8787/status` for LaunchAgent verification | Complete |
| Daemon is running | `vivarium daemon smoke --status-url http://127.0.0.1:8787/status` returned `Status: ok` | Complete |
| Local loop runs after install | Installed `/Users/idanmann/.local/bin/vivarium local run` is the current shorthand for the validated local run path and defaults to the `build a tiny local agent` goal with the `local-agent` identity | Complete |
| Local code gates pass | `bun run lint`, `bun run typecheck`, `bun run build`, `bun run knip`, `bun run public-release:scan`, `bun run format:check`, `git diff --check`, and `bun test` passed; the full test suite reported `504 pass, 0 fail` after the local-agent readiness refresh | Complete |
| PR checks pass | PR #22 merged as `991b177` and PR #23 merged as `9d21154`; both had successful `verify`, `changeset`, `Analyze JavaScript and TypeScript`, and CodeQL scanning checks | Complete |
| Launch security posture is verified | `bun run launch:security-audit` returned `ok:true` for public agent/world repos, enabled branch protection, enabled secret scanning and push protection, and zero open Dependabot, secret scanning, or code scanning alerts | Complete |

## Remaining Blockers

Do not claim full v1 production readiness yet. A fresh installed
`vivarium doctor --live --env-file live-readiness.local.env` still reports
`34 passing, 19 blocked`.

The remaining blockers require:

- Real provider keys for Anthropic/OpenRouter, the private OpenAI-compatible provider
  key/base/model/context/profile, and smoke transcripts for all three provider
  paths.
- An encrypted internal credential store and successful internal credential
  smoke.
- Real v1 evidence for public contribution, published artifacts, curation stats,
  and the required two-week improvement evidence.

The public agent repository and public world repository are now public, the
Mac installer PRs are merged, and branch protection remained intact. The live
readiness gate is intentionally still blocked until real secrets and inspectable
v1 evidence exist.

## Operator Handoff

Run this on the Mac:

```bash
curl -fsSL https://raw.githubusercontent.com/idanmann10/vivarium-agent/main/scripts/install.sh | VIVARIUM_DAEMON=launchd bash
```

Then run:

```bash
vivarium local run
vivarium daemon smoke --status-url http://127.0.0.1:8787/status
vivarium connect
vivarium doctor --live --env-file live-readiness.local.env
```

Expected local result: the run succeeds, daemon smoke reports `Status: ok`, and
blocked live setup points at `live-readiness.local.env` plus the production input
groups still needed. Full v1 live readiness is intentionally not claimed until
`doctor --live` reports ready.
