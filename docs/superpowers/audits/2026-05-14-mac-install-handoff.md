# Mac Install Handoff Audit

## Objective Restated

Provide a command that installs Vivarium locally on the Mac, starts the local
agent daemon, and leaves the operator with a clear setup walkthrough and an
honest production-readiness boundary.

## Install Command

Use the branch-pinned installer until PR #22 is reviewed and merged:

```bash
curl -fsSL https://raw.githubusercontent.com/idanmann10/vivarium-agent/codex/hermes-style-quick-setup/scripts/install.sh | \
  VIVARIUM_AGENT_REF=codex/hermes-style-quick-setup \
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
| Branch installer can pin the checkout | `scripts/install.test.ts` covers `VIVARIUM_AGENT_REF=codex/hermes-style-quick-setup`, and a real `/private/tmp` install from the raw GitHub branch checked out the matching branch | Complete |
| Fresh installs prefill safe public metadata | `scripts/install.test.ts` covers GitHub URL inference for `--github-owner`, `--agent-repo`, `--world-repo`, and `--canonical-world-ref`; installed `bash scripts/install.sh --dry-run` shows those inferred arguments for the public repos | Complete |
| Existing installs keep updating from GitHub | `scripts/install.test.ts` covers existing checkout remote normalization; the real installed checkout has `origin` set to `https://github.com/idanmann10/vivarium-agent.git`, and `vivarium update` completed `git pull --ff-only` plus `bun install --frozen-lockfile` | Complete |
| Real Mac installed checkout is current | Installed checkout `~/.vivarium/vivarium-agent` is synced to the latest pushed head of the installed branch `codex/hermes-style-quick-setup` with a clean status after the latest handoff update | Complete |
| CLI walkthrough explains the Mac daemon step | Installed `vivarium help` shows `Verify the Mac daemon` and `vivarium daemon smoke --status-url http://127.0.0.1:8787/status` | Complete |
| Daemon is running | `vivarium daemon smoke --status-url http://127.0.0.1:8787/status` returned `Status: ok` | Complete |
| Local code gates pass | `bun run lint`, `bun run typecheck`, `bun run build`, `bun run knip`, `bun run public-release:scan`, `bun run format:check`, `git diff --check`, and `bun test` passed; the full test suite reported `399 pass, 0 fail` | Complete |
| PR checks pass | PR #22 on branch `codex/hermes-style-quick-setup` has successful `verify`, `changeset`, `Analyze JavaScript and TypeScript`, and CodeQL scanning checks before handoff | Complete |
| Launch security posture is verified | `bun run launch:security-audit` returned `ok:true` for public agent/world repos, enabled branch protection, enabled secret scanning and push protection, and zero open Dependabot, secret scanning, or code scanning alerts | Complete |

## Remaining Blockers

Do not claim full v1 production readiness yet. A fresh installed
`vivarium doctor --live --env-file live-readiness.local.env` still reports
`21 passing, 32 blocked`.

The remaining blockers require:

- A non-author review for PR #22; GitHub reports `REVIEW_REQUIRED`.
- Real provider keys, model names, context windows, saved profiles, and smoke
  transcripts for Anthropic, OpenRouter, and the private OpenAI-compatible
  provider.
- An encrypted internal credential store and successful internal credential
  smoke.
- Valid GitHub token/write evidence for live Discussions, PRs, and main-branch
  CI checks.
- Real v1 evidence for public contribution, published artifacts, curation stats,
  and the required two-week improvement evidence.

## Review Unblock

Only configured collaborator: `idanmann10`. The repository currently has no teams
and no pending eligible review request. Because PR #22 is authored by
`idanmann10`, that account cannot satisfy the required non-author review.

Safe owner action:

1. Add or request one eligible reviewer who can approve PR #22.
2. Let the existing auto-merge request merge the PR after review and checks pass.

Do not lower branch protection just to merge this PR unless the repository owner
explicitly decides to change the safety policy.

### Reviewer Handoff

Send this to an eligible non-author reviewer:

```text
Please review https://github.com/idanmann10/vivarium-agent/pull/22.

The PR installs Vivarium locally on macOS, starts the LaunchAgent daemon, and
prints the setup walkthrough. To smoke-test it on a Mac:

curl -fsSL https://raw.githubusercontent.com/idanmann10/vivarium-agent/codex/hermes-style-quick-setup/scripts/install.sh | \
  VIVARIUM_AGENT_REF=codex/hermes-style-quick-setup \
  VIVARIUM_DAEMON=launchd \
  bash

Then run:

vivarium run --goal "validate local setup" --state-path .vivarium/state.db
vivarium daemon smoke --status-url http://127.0.0.1:8787/status
vivarium setup --env-file live-readiness.local.env --domain coding --world-root ~/.vivarium/the-world --state-path .vivarium/state.db

Expected local result: the run succeeds, daemon smoke reports Status: ok, and
blocked live setup points at live-readiness.local.env plus the production input
groups still needed. Full v1 live readiness is intentionally not claimed until
doctor --live returns ok:true.

If this looks good, approve PR #22. Do not lower branch protection to merge it.
Auto-merge is already enabled.
```

## Post-Merge Command

After PR #22 has a non-author review and merges to `main`, the stable public
command becomes:

```bash
curl -fsSL https://raw.githubusercontent.com/idanmann10/vivarium-agent/main/scripts/install.sh | VIVARIUM_DAEMON=launchd bash
```
