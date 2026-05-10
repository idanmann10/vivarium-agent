---
title: Live Readiness
description: Clear the external blockers required before v1 live verification.
when_to_read: When `doctor --live` reports missing remotes, credentials, GitHub auth, or Docker Compose.
---

# Live Readiness

Use this guide after the local test suite is green and before claiming v1 is live-verified. The local implementation can run offline, but the roadmap's v1 done criteria still require real provider calls, GitHub writes, cross-install world pulls, and daemon supervision.

Run the readiness check from `the-agent`:

```bash
bun apps/cli/src/index.ts doctor --live \
  --agent-root /Users/idanmann/Vivarium/the-agent \
  --world-root /Users/idanmann/Vivarium/the-world
```

A live-ready workspace should report configured agent/world remotes, configured provider and GitHub token environment, valid GitHub auth, installed Docker, and installed Docker Compose.

## Git Remotes

Both repos need canonical GitHub remotes before Discussions, PRs, auto-merge, and cross-install pulls can be verified.

```bash
git -C /Users/idanmann/Vivarium/the-agent remote add origin git@github.com:<owner>/<agent-repo>.git
git -C /Users/idanmann/Vivarium/the-world remote add origin git@github.com:<owner>/<world-repo>.git
git -C /Users/idanmann/Vivarium/the-agent remote -v
git -C /Users/idanmann/Vivarium/the-world remote -v
```

Replace the placeholders with the final repo names. The roadmap still treats `the-agent` and `the-world` as temporary names.

## Provider Environment

At least one real model provider key must be present before live provider calls and provider-backed anonymization can be verified.

```bash
export OPENAI_API_KEY=<redacted>
export ANTHROPIC_API_KEY=<redacted>
export OPENROUTER_API_KEY=<redacted>
```

Only one provider is required for a first live pass. Keep secrets out of git and shell history where possible.

Save the live provider as a profile:

```bash
bun apps/cli/src/index.ts providers configure \
  --profiles-path /tmp/vivarium-provider-profiles.json \
  --name openrouter \
  --kind openai-compat \
  --api-key-env OPENROUTER_API_KEY \
  --model <model> \
  --base-url <provider-base-url> \
  --capability chat \
  --capability json_mode \
  --context-window <context-window> \
  --cost-class medium
```

For OpenAI or Anthropic profiles, use `--kind openai` or `--kind anthropic` and omit `--base-url`.

Then run a provider smoke completion through the saved profile:

```bash
bun apps/cli/src/index.ts providers smoke \
  --profiles-path /tmp/vivarium-provider-profiles.json \
  --profile openrouter
```

The one-off smoke flags still work when you do not need to save the profile:

```bash
bun apps/cli/src/index.ts providers smoke \
  --kind openai \
  --api-key-env OPENAI_API_KEY \
  --model <model>
```

For Anthropic, use `--kind anthropic --api-key-env ANTHROPIC_API_KEY`. For OpenAI-compatible providers, include a base URL:

```bash
bun apps/cli/src/index.ts providers smoke \
  --kind openai-compat \
  --api-key-env OPENROUTER_API_KEY \
  --model <model> \
  --base-url <provider-base-url>
```

After smoke succeeds, run a real goal through the same provider path:

```bash
bun apps/cli/src/index.ts run \
  --goal "<small real coding goal>" \
  --domain coding \
  --world-root /Users/idanmann/Vivarium/the-world \
  --state-path /tmp/vivarium-live-state.db \
  --provider-profiles-path /tmp/vivarium-provider-profiles.json \
  --provider-profile openrouter
```

One-off run flags also remain available. Use `--provider-kind openai` or `--provider-kind anthropic` without `--provider-base-url` for first-party providers.

## Internal API Credential

After adding an internal API credential, smoke it through the encrypted keychain and HTTP dispatcher:

```bash
bun apps/cli/src/index.ts credentials add \
  --path /tmp/vivarium-credentials.enc \
  --master-key <local-master-key> \
  --kind bearer \
  --name INTERNAL_API_TOKEN \
  --purpose "Call internal API" \
  --value <redacted>

bun apps/cli/src/index.ts credentials smoke \
  --path /tmp/vivarium-credentials.enc \
  --master-key <local-master-key> \
  --name INTERNAL_API_TOKEN \
  --url <internal-health-url> \
  --method GET
```

The smoke result reports status and a response preview without returning the secret value.

## GitHub Auth

GitHub writes need a valid authenticated CLI session or token environment. Use one of these paths:

```bash
gh auth login -h github.com
gh auth status
```

or:

```bash
export GITHUB_TOKEN=<redacted>
export GH_TOKEN=<redacted>
gh auth status
```

The token must be able to create Discussions, branches, pull requests, issues, and read workflow state for the chosen world remote.

Then run a read-only GitHub smoke check:

```bash
bun apps/cli/src/index.ts github smoke \
  --owner <owner> \
  --repo <world-repo> \
  --token-env GITHUB_TOKEN
```

The command reports repository visibility, default branch, Discussions availability, and token permissions when GitHub returns them.

Open the Phase 0 RFC Discussion only after the target repository ID and Discussion category ID are known:

```bash
bun apps/cli/src/index.ts github discussion \
  --owner <owner> \
  --repo <world-repo> \
  --token-env GITHUB_TOKEN \
  --repository-id <repository-node-id> \
  --category-id <discussion-category-node-id> \
  --title "Phase 0 Bootstrap RFC" \
  --body "$(cat /Users/idanmann/Vivarium/the-world/proposals/0001-phase-0-bootstrap-rfc.md)" \
  --confirm-write
```

Without `--confirm-write`, the command refuses before reading credentials or calling GitHub.

After a generated artifact has been committed to a branch, open a contribution PR:

```bash
bun apps/cli/src/index.ts github pull-request \
  --owner <owner> \
  --repo <world-repo> \
  --token-env GITHUB_TOKEN \
  --title "Add generated artifact" \
  --body "<summary and validation evidence>" \
  --head <branch-or-owner:branch> \
  --base main \
  --confirm-write
```

Without `--confirm-write`, the command refuses before reading credentials or calling GitHub.

After the Discussion or PR is open, inspect workflow runs:

```bash
bun apps/cli/src/index.ts github workflow-runs \
  --owner <owner> \
  --repo <world-repo> \
  --token-env GITHUB_TOKEN \
  --branch main \
  --limit 10
```

Use this to verify the validator, stats, trust-gate, and archive workflows that are relevant to the live contribution.

## Multi-World Subscriptions

After the canonical world and a private fork are available locally, save both subscriptions and verify that retrieval searches both while preserving source labels:

```bash
bun apps/cli/src/index.ts world subscribe \
  --subscriptions-path /tmp/vivarium-world-subscriptions.json \
  --world-root /tmp/vivarium-world-canonical \
  --world-label canonical \
  --world-ref <canonical-world-remote-url> \
  --priority 1

bun apps/cli/src/index.ts world subscribe \
  --subscriptions-path /tmp/vivarium-world-subscriptions.json \
  --world-root /tmp/vivarium-world-private \
  --world-label private \
  --world-ref <private-world-remote-url> \
  --priority 0 \
  --auto-push

bun apps/cli/src/index.ts world subscriptions \
  --subscriptions-path /tmp/vivarium-world-subscriptions.json
```

Search through the saved registry:

```bash
bun apps/cli/src/index.ts world search \
  --subscriptions-path /tmp/vivarium-world-subscriptions.json \
  --domain coding \
  --query "<artifact title or distinctive phrase>" \
  --limit 3
```

For one-off checks without writing the registry, repeated roots still work:

```bash
bun apps/cli/src/index.ts world search \
  --world-root /tmp/vivarium-world-private \
  --world-label private \
  --world-root /tmp/vivarium-world-canonical \
  --world-label canonical \
  --domain coding \
  --query "<artifact title or distinctive phrase>" \
  --limit 3
```

Repeated `--world-root` flags are searched in order. Use priority `0` or list the private fork first when team/internal knowledge should have priority over the canonical world.

## Cross-Install World Pull

After a contribution has landed in the canonical world remote, verify that a separate local install can pull the remote and retrieve the accepted artifact:

```bash
bun apps/cli/src/index.ts world transmission-smoke \
  --remote <canonical-world-remote-url> \
  --destination /tmp/vivarium-world-second-install \
  --ref main \
  --domain coding \
  --query "<accepted artifact title or distinctive phrase>" \
  --limit 3
```

The command clones or updates the destination, searches the pulled world, and returns `ok: true` only when the expected artifact is discoverable from the second install.

## Docker Compose

Daemon supervision needs either the Docker Compose plugin or the standalone `docker-compose` command.

```bash
docker --version
docker compose version
docker-compose version
```

At least one Compose command must succeed. Then verify the daemon supervisor:

```bash
docker compose -f /Users/idanmann/Vivarium/the-agent/docker-compose.yml config
docker compose -f /Users/idanmann/Vivarium/the-agent/docker-compose.yml up --build vivarium-daemon
bun apps/cli/src/index.ts daemon smoke --status-url http://127.0.0.1:8787/status
```

## Verification Sequence

After the external prerequisites are configured:

1. Re-run `doctor --live`.
2. Save a provider profile with `providers configure`, then run `providers smoke --profile`.
3. Run `run` with `--provider-profiles-path` and `--provider-profile` against a small real goal.
4. Add and smoke one internal API credential with `credentials add` and `credentials smoke`.
5. Run `github smoke` for the canonical world remote.
6. Open the Phase 0 RFC Discussion in the world remote with `github discussion --confirm-write`.
7. Create a live world contribution PR from a generated artifact with `github pull-request --confirm-write`.
8. Verify the world workflows and trust gates on GitHub with `github workflow-runs`.
9. Save canonical and private fork subscriptions with `world subscribe`, then verify retrieval with `world search --subscriptions-path`.
10. Pull the accepted contribution into a second local install with `world transmission-smoke`.
11. Run the Compose daemon and verify `/status` with `daemon smoke`.

Record the resulting command output in `docs/superpowers/audits/2026-05-09-v1-completion-audit.md`.
